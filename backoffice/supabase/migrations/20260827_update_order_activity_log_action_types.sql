alter table public.order_activity_log
drop constraint if exists order_activity_log_action_type_check;

alter table public.order_activity_log
add constraint order_activity_log_action_type_check
check (
  action_type in (
    'created',
    'order_updated',
    'status_changed',
    'reminder_sent',
    'customer_logo_uploaded',
    'print_proof_ready',
    'print_proof_approved',
    'print_proof_rejected'
  )
) not valid;
