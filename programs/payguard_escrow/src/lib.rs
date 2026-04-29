use anchor_lang::prelude::*;

declare_id!("PaYGuaRDc2xSiLrq7WQ9EBkCqV2XvZQp9vYywYf8d3k");

#[program]
pub mod payguard_escrow {
    use super::*;

    pub fn create_guarded_payment(_ctx: Context<CreateGuardedPayment>) -> Result<()> {
        err!(PayguardError::NotImplemented)
    }

    pub fn cancel_guarded_payment(_ctx: Context<CancelGuardedPayment>) -> Result<()> {
        err!(PayguardError::NotImplemented)
    }

    pub fn claim_guarded_payment(_ctx: Context<ClaimGuardedPayment>) -> Result<()> {
        err!(PayguardError::NotImplemented)
    }
}

#[derive(Accounts)]
pub struct CreateGuardedPayment {}

#[derive(Accounts)]
pub struct CancelGuardedPayment {}

#[derive(Accounts)]
pub struct ClaimGuardedPayment {}

#[error_code]
pub enum PayguardError {
    #[msg("This instruction is a Day 1 placeholder and is not implemented yet.")]
    NotImplemented,
}

