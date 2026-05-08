-- Add 'awaiting_payment' status so request isn't marked paid until buyer confirms
alter table request drop constraint if exists request_status_check;
alter table request add constraint request_status_check
  check (status in ('pending', 'active', 'awaiting_payment', 'paid', 'cancelled'));
