-- 022_expand_segments.sql
--
-- Cindy flagged the segment list was too narrow for real-world site types
-- (2026-08-19): add Transit Station (broader than Airport — rail/subway/
-- bus), Manufacturing Facility, and Laundromat. Also broaden 'Hospital' to
-- 'Healthcare' since the narrower word excludes clinics/urgent care/senior
-- living — same slot, existing rows relabeled, no data loss.

-- Drop the constraint BEFORE the backfill — otherwise the UPDATE below is
-- rejected by the still-active old constraint, which doesn't know
-- 'Healthcare' yet (same class of bug as migration 018's first attempt).
alter table accounts drop constraint if exists accounts_segment_check;

update accounts set segment = 'Healthcare' where segment = 'Hospital';

alter table accounts add constraint accounts_segment_check
  check (segment in (
    'Hotel','Airport','Transit Station','University','Healthcare',
    'Office / Corporate','Convenience Retail','Manufacturing Facility','Laundromat',
    'Distributor','Entertainment','Individual','Unknown'
  ));
