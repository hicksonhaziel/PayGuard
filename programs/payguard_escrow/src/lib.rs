use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};
use spl_token::state::Mint;

solana_program::declare_id!("CzQ6EYC8PBwLC5QsrAcrjeEQKJzbcLWZfTta7Qi8MZKZ");

// Escrow PDA: ["payguard-escrow", sender, escrow_id].
const ESCROW_SEED: &[u8] = b"payguard-escrow";
// Fixed account layout used by the Electron client for guarded discovery.
const STATE_LEN: usize = 1 + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 1;
const STATUS_FUNDED: u8 = 1;
const STATUS_CANCELLED: u8 = 2;
const STATUS_CLAIMED: u8 = 3;

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    if program_id != &id() {
        return Err(ProgramError::IncorrectProgramId);
    }

    let (&tag, rest) = instruction_data
        .split_first()
        .ok_or(ProgramError::InvalidInstructionData)?;

    match tag {
        0 => process_create_guarded_payment(program_id, accounts, rest),
        1 => process_cancel_guarded_payment(program_id, accounts),
        2 => process_claim_guarded_payment(program_id, accounts),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

fn process_create_guarded_payment(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let (amount, unlock_at, escrow_id) = unpack_create_data(data)?;
    let account_info_iter = &mut accounts.iter();
    let sender = next_account_info(account_info_iter)?;
    let escrow = next_account_info(account_info_iter)?;
    let sender_token = next_account_info(account_info_iter)?;
    let vault_token = next_account_info(account_info_iter)?;
    let recipient = next_account_info(account_info_iter)?;
    let mint = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    if !sender.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let (expected_escrow, bump) = derive_escrow(program_id, sender.key, &escrow_id);

    // Only the PDA for this sender and escrow id can hold the escrow state.
    if expected_escrow != *escrow.key {
        return Err(ProgramError::InvalidSeeds);
    }

    if !escrow.data_is_empty() {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    let clock = Clock::get()?;

    if unlock_at <= clock.unix_timestamp {
        return Err(PayguardEscrowError::InvalidUnlockTime.into());
    }

    // The program owns the escrow state account; the token vault is an ATA owned by this PDA.
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(STATE_LEN);
    let escrow_id_seed = escrow_id.as_ref();
    let signer_seeds: &[&[u8]] = &[ESCROW_SEED, sender.key.as_ref(), escrow_id_seed, &[bump]];

    invoke_signed(
        &solana_program::system_instruction::create_account(
            sender.key,
            escrow.key,
            lamports,
            STATE_LEN as u64,
            program_id,
        ),
        &[sender.clone(), escrow.clone(), system_program.clone()],
        &[signer_seeds],
    )?;

    let mint_data = Mint::unpack(&mint.data.borrow())?;

    invoke(
        &spl_token::instruction::transfer_checked(
            token_program.key,
            sender_token.key,
            mint.key,
            vault_token.key,
            sender.key,
            &[],
            amount,
            mint_data.decimals,
        )?,
        &[
            sender_token.clone(),
            mint.clone(),
            vault_token.clone(),
            sender.clone(),
            token_program.clone(),
        ],
    )?;

    let state = EscrowState {
        status: STATUS_FUNDED,
        sender: *sender.key,
        recipient: *recipient.key,
        mint: *mint.key,
        vault_token: *vault_token.key,
        escrow_id,
        amount,
        created_at: clock.unix_timestamp,
        unlock_at,
        bump,
    };

    state.pack(&mut escrow.data.borrow_mut())
}

fn process_cancel_guarded_payment(_program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let sender = next_account_info(account_info_iter)?;
    let escrow = next_account_info(account_info_iter)?;
    let vault_token = next_account_info(account_info_iter)?;
    let sender_token = next_account_info(account_info_iter)?;
    let mint = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    if !sender.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut state = EscrowState::unpack(&escrow.data.borrow())?;

    if state.status != STATUS_FUNDED {
        return Err(PayguardEscrowError::EscrowNotFunded.into());
    }

    if state.sender != *sender.key {
        return Err(PayguardEscrowError::Unauthorized.into());
    }

    // Client supplies the vault and mint; verify they match the stored escrow.
    if state.vault_token != *vault_token.key || state.mint != *mint.key {
        return Err(ProgramError::InvalidAccountData);
    }

    let clock = Clock::get()?;

    if clock.unix_timestamp >= state.unlock_at {
        return Err(PayguardEscrowError::AlreadyUnlocked.into());
    }

    // Before unlock, only the sender can recover funds from the PDA-owned vault.
    transfer_from_vault(
        &state,
        escrow,
        vault_token,
        sender_token,
        mint,
        token_program,
    )?;

    state.status = STATUS_CANCELLED;
    state.pack(&mut escrow.data.borrow_mut())
}

fn process_claim_guarded_payment(_program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let recipient = next_account_info(account_info_iter)?;
    let escrow = next_account_info(account_info_iter)?;
    let vault_token = next_account_info(account_info_iter)?;
    let recipient_token = next_account_info(account_info_iter)?;
    let mint = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    if !recipient.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let mut state = EscrowState::unpack(&escrow.data.borrow())?;

    if state.status != STATUS_FUNDED {
        return Err(PayguardEscrowError::EscrowNotFunded.into());
    }

    if state.recipient != *recipient.key {
        return Err(PayguardEscrowError::Unauthorized.into());
    }

    // Claim uses the same vault and mint recorded when the guarded payment was created.
    if state.vault_token != *vault_token.key || state.mint != *mint.key {
        return Err(ProgramError::InvalidAccountData);
    }

    let clock = Clock::get()?;

    if clock.unix_timestamp < state.unlock_at {
        return Err(PayguardEscrowError::NotUnlocked.into());
    }

    // After unlock, only the intended recipient can release funds.
    transfer_from_vault(
        &state,
        escrow,
        vault_token,
        recipient_token,
        mint,
        token_program,
    )?;

    state.status = STATUS_CLAIMED;
    state.pack(&mut escrow.data.borrow_mut())
}

fn transfer_from_vault<'a>(
    state: &EscrowState,
    escrow: &AccountInfo<'a>,
    vault_token: &AccountInfo<'a>,
    destination_token: &AccountInfo<'a>,
    mint: &AccountInfo<'a>,
    token_program: &AccountInfo<'a>,
) -> ProgramResult {
    let mint_data = Mint::unpack(&mint.data.borrow())?;
    let escrow_id_seed = state.escrow_id.as_ref();
    // The escrow PDA signs token transfers as the vault authority.
    let signer_seeds: &[&[u8]] = &[
        ESCROW_SEED,
        state.sender.as_ref(),
        escrow_id_seed,
        &[state.bump],
    ];

    invoke_signed(
        &spl_token::instruction::transfer_checked(
            token_program.key,
            vault_token.key,
            mint.key,
            destination_token.key,
            escrow.key,
            &[],
            state.amount,
            mint_data.decimals,
        )?,
        &[
            vault_token.clone(),
            mint.clone(),
            destination_token.clone(),
            escrow.clone(),
            token_program.clone(),
        ],
        &[signer_seeds],
    )
}

fn derive_escrow(program_id: &Pubkey, sender: &Pubkey, escrow_id: &[u8; 32]) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[ESCROW_SEED, sender.as_ref(), escrow_id], program_id)
}

// Create instruction data: amount u64, unlock_at i64, escrow_id [u8; 32].
fn unpack_create_data(data: &[u8]) -> Result<(u64, i64, [u8; 32]), ProgramError> {
    if data.len() != 48 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let amount = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let unlock_at = i64::from_le_bytes(data[8..16].try_into().unwrap());
    let escrow_id: [u8; 32] = data[16..48].try_into().unwrap();

    if amount == 0 {
        return Err(ProgramError::InvalidInstructionData);
    }

    Ok((amount, unlock_at, escrow_id))
}

// Serialized manually to keep the on-chain account small and client decoding stable.
struct EscrowState {
    status: u8,
    sender: Pubkey,
    recipient: Pubkey,
    mint: Pubkey,
    vault_token: Pubkey,
    escrow_id: [u8; 32],
    amount: u64,
    created_at: i64,
    unlock_at: i64,
    bump: u8,
}

impl EscrowState {
    fn pack(&self, dst: &mut [u8]) -> ProgramResult {
        if dst.len() < STATE_LEN {
            return Err(ProgramError::AccountDataTooSmall);
        }

        let mut offset = 0;
        dst[offset] = self.status;
        offset += 1;
        dst[offset..offset + 32].copy_from_slice(self.sender.as_ref());
        offset += 32;
        dst[offset..offset + 32].copy_from_slice(self.recipient.as_ref());
        offset += 32;
        dst[offset..offset + 32].copy_from_slice(self.mint.as_ref());
        offset += 32;
        dst[offset..offset + 32].copy_from_slice(self.vault_token.as_ref());
        offset += 32;
        dst[offset..offset + 32].copy_from_slice(&self.escrow_id);
        offset += 32;
        dst[offset..offset + 8].copy_from_slice(&self.amount.to_le_bytes());
        offset += 8;
        dst[offset..offset + 8].copy_from_slice(&self.created_at.to_le_bytes());
        offset += 8;
        dst[offset..offset + 8].copy_from_slice(&self.unlock_at.to_le_bytes());
        offset += 8;
        dst[offset] = self.bump;

        Ok(())
    }

    fn unpack(src: &[u8]) -> Result<Self, ProgramError> {
        if src.len() < STATE_LEN {
            return Err(ProgramError::InvalidAccountData);
        }

        let mut offset = 0;
        let status = src[offset];
        offset += 1;
        let sender = Pubkey::new_from_array(src[offset..offset + 32].try_into().unwrap());
        offset += 32;
        let recipient = Pubkey::new_from_array(src[offset..offset + 32].try_into().unwrap());
        offset += 32;
        let mint = Pubkey::new_from_array(src[offset..offset + 32].try_into().unwrap());
        offset += 32;
        let vault_token = Pubkey::new_from_array(src[offset..offset + 32].try_into().unwrap());
        offset += 32;
        let escrow_id = src[offset..offset + 32].try_into().unwrap();
        offset += 32;
        let amount = u64::from_le_bytes(src[offset..offset + 8].try_into().unwrap());
        offset += 8;
        let created_at = i64::from_le_bytes(src[offset..offset + 8].try_into().unwrap());
        offset += 8;
        let unlock_at = i64::from_le_bytes(src[offset..offset + 8].try_into().unwrap());
        offset += 8;
        let bump = src[offset];

        Ok(Self {
            status,
            sender,
            recipient,
            mint,
            vault_token,
            escrow_id,
            amount,
            created_at,
            unlock_at,
            bump,
        })
    }
}

#[repr(u32)]
enum PayguardEscrowError {
    InvalidUnlockTime = 6000,
    EscrowNotFunded = 6001,
    Unauthorized = 6002,
    AlreadyUnlocked = 6003,
    NotUnlocked = 6004,
}

impl From<PayguardEscrowError> for ProgramError {
    fn from(error: PayguardEscrowError) -> Self {
        ProgramError::Custom(error as u32)
    }
}
