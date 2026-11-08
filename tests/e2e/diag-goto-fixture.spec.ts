// THROWAWAY (diag branch only): the shared fixture with the new quiet-right-now wait.
import { test } from './fixtures/test';
import { defineCases } from './diag-goto-body';

defineCases(test as never, 'fixture', true);
