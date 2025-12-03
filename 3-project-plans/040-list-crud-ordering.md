# 040: List CRUD & Ordering

## Restore Behavior

**TODO**: Handle edge case when restoring archived tasks where the original list no longer exists (list was deleted). See [[030-task-crud-ordering]] for restore implementation details.

**Current behavior (from milestone 030)**: Restore appends task to end of list (max order + 1). If list doesn't exist, this needs to be handled gracefully (show error, restore to default list, or prevent restore).

