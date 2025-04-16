import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Treasury API functions
export async function createBankAccount(companyId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('create-treasury-account', {
      body: { companyId }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating bank account:', error);
    throw error;
  }
}

export async function getBankAccountDetails(accountId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('get-treasury-account', {
      body: { accountId }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting bank account details:', error);
    throw error;
  }
}

// Issuing API functions
export async function createCard(bankAccountId: string, cardType: 'virtual' | 'physical') {
  try {
    const { data, error } = await supabase.functions.invoke('create-issuing-card', {
      body: { bankAccountId, cardType }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating card:', error);
    throw error;
  }
}

export async function updateCardStatus(cardId: string, status: 'active' | 'blocked' | 'canceled') {
  try {
    const { data, error } = await supabase.functions.invoke('update-card-status', {
      body: { cardId, status }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating card status:', error);
    throw error;
  }
}

// Capital API functions
export async function applyForCapital(companyId: string, amount: number) {
  try {
    const { data, error } = await supabase.functions.invoke('apply-for-capital', {
      body: { companyId, amount }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error applying for capital:', error);
    throw error;
  }
}

export async function getCapitalApplication(applicationId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('get-capital-application', {
      body: { applicationId }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting capital application:', error);
    throw error;
  }
}