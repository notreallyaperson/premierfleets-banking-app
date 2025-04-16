import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import { AlertTriangle } from 'lucide-react';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile } = useAuthStore();

  useEffect(() => {
    let retryCount = 0;
    let mounted = true;

    const fetchProfile = async (userId: string) => {
      try {
        // First check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // Profile doesn't exist, create it with test company
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .upsert([
                {
                  id: userId,
                  company_id: 'e52869a7-4f5d-4f19-b25f-2dc0e9aa0226', // Test company ID
                  role: 'admin',
                  first_name: 'Test',
                  last_name: 'User'
                }
              ])
              .select()
              .single();

            if (createError) {
              throw createError;
            }

            if (mounted) {
              setProfile(newProfile);
            }
            return;
          }
          
          throw fetchError;
        }

        if (mounted) {
          setProfile(existingProfile);
        }
      } catch (error: any) {
        console.error('Error in fetchProfile:', error);
        
        // Retry on network errors or when offline
        if (retryCount < MAX_RETRIES && (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('network') ||
          !navigator.onLine
        )) {
          retryCount++;
          console.log(`Retrying profile fetch (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(() => fetchProfile(userId), RETRY_DELAY * retryCount);
          return;
        }

        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 bg-red-50 p-4 rounded-lg shadow-lg z-50 flex items-start space-x-3';
        errorDiv.innerHTML = `
          <div class="flex-shrink-0">
            <AlertTriangle class="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 class="text-sm font-medium text-red-800">Connection Error</h3>
            <p class="mt-1 text-sm text-red-700">
              Unable to load profile data. Please check your connection and refresh the page.
            </p>
          </div>
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        }
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}