DELETE FROM partners
WHERE lower(email) = 'test-partner@clothcycleph.local'
  AND EXISTS (
    SELECT 1
    FROM partners real_partner
    WHERE lower(real_partner.name) = 'test partner'
      AND lower(real_partner.email) <> 'test-partner@clothcycleph.local'
  );
