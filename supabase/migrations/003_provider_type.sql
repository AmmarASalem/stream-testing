-- Add provider type and contractor ID to sellers table
alter table sellers add column if not exists provider_type text not null default 'engineering_office';
alter table sellers add column if not exists contractor_id text;

-- provider_type values: 'engineering_office' | 'contractor'
