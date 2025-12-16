BEGIN TRANSACTION;
DELETE FROM expense_items WHERE expense_id IN (SELECT id FROM expenses WHERE deleted_at IS NOT NULL);
DELETE FROM expenses WHERE deleted_at IS NOT NULL;
COMMIT;
