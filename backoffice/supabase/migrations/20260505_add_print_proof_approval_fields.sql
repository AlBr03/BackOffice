alter table public.orders
add column if not exists print_proof_status text default 'pending',
add column if not exists print_proof_feedback text,
add column if not exists print_proof_responded_at timestamptz;
