// Configuration for Supabase credentials.
// It will first check if credentials are saved in localStorage (allowing dynamic entry).
// If not found, it falls back to empty strings, which prompts the user to enter them in the UI.
const CONFIG = {
    // You can hardcode your Supabase credentials here if you don't want players to enter them:
    SUPABASE_URL: window.localStorage.getItem('WC_SUPABASE_URL') || '',
    SUPABASE_KEY: window.localStorage.getItem('WC_SUPABASE_KEY') || '',
    
    // Save credentials to localStorage
    saveCredentials(url, key) {
        window.localStorage.setItem('WC_SUPABASE_URL', url.trim());
        window.localStorage.setItem('WC_SUPABASE_KEY', key.trim());
        this.SUPABASE_URL = url.trim();
        this.SUPABASE_KEY = key.trim();
    },
    
    // Clear credentials
    clearCredentials() {
        window.localStorage.removeItem('WC_SUPABASE_URL');
        window.localStorage.removeItem('WC_SUPABASE_KEY');
        this.SUPABASE_URL = '';
        this.SUPABASE_KEY = '';
    },
    
    // Check if configured
    isConfigured() {
        return this.SUPABASE_URL !== '' && this.SUPABASE_KEY !== '';
    }
};

export default CONFIG;
