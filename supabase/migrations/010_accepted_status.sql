alter table request drop constraint if exists request_status_check;
alter table request add constraint request_status_check
  check (status in ('pending', 'active', 'accepted', 'awaiting_payment', 'paid', 'cancelled'));
