// THROWAWAY (diag branch only): control, Playwright's own test, no settle.
import { test } from '@playwright/test';
import { defineCases } from './diag-goto-body';

defineCases(test, 'raw', false);
