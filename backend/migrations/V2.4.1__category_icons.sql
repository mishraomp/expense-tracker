-- Assign default Bootstrap icon names to predefined categories.
-- NOTE: ON CONFLICT clause is invalid for UPDATE; removed the erroneous suffix.
UPDATE categories
SET icon = CASE name
    WHEN 'Food & Dining' THEN 'bi-cup-hot'
    WHEN 'Transportation' THEN 'bi-car-front'
    WHEN 'Shopping' THEN 'bi-bag-check'
    WHEN 'Entertainment' THEN 'bi-film'
    WHEN 'Bills & Utilities' THEN 'bi-receipt'
    WHEN 'Healthcare' THEN 'bi-heart-pulse'
    WHEN 'Personal' THEN 'bi-person'
    WHEN 'Other' THEN 'bi-three-dots'
END
WHERE name IN (
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
    'Bills & Utilities', 'Healthcare', 'Personal', 'Other'
);