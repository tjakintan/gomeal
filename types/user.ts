export type User = {
    sub: string;
    email: string;
    firstName?: string;
    lastName?: string;
    dob: string; 
    profile_img_url?: string | null;
    profile_name: string;
    created_at?: string | Date | null;
    updated_at?: string | Date | null;
    last_login?: string | Date | null;
    status?: string;
    status_created_on?: string | Date | null;
    provider?: string;
    provider_sub?: string | null;
}