# Known Issues — Unmerged Fixes from Model A

These changes were written by Model A during TASK_5252 but never tested against Docker/Playwright. The code is complete and follows consistent patterns but needs verification before committing.

## Keyboard Navigation (5 components)

WCAG-compliant tab navigation using Arrow keys, Home/End. Same pattern across all five files (~54 lines each, TileLayerSelector is ~111 lines).

Source files in `model_a/src/components/`:

| Component         | File                                             | Tabs                              | Keys                           |
| ----------------- | ------------------------------------------------ | --------------------------------- | ------------------------------ |
| ConversationList  | `atomic/ConversationList/ConversationList.tsx`   | All, Unread, Archived             | Arrow, Home, End               |
| UnifiedSidebar    | `layout/UnifiedSidebar/UnifiedSidebar.tsx`       | Chats, Connections                | Arrow, Home, End               |
| ConnectionManager | `atomic/ConnectionManager/ConnectionManager.tsx` | Received, Sent, Accepted, Blocked | Arrow, Home, End               |
| PaymentButton     | `atomic/PaymentButton/PaymentButton.tsx`         | Stripe, PayPal                    | Arrow, Home, End               |
| TileLayerSelector | `atomic/TileLayerSelector/TileLayerSelector.tsx` | Provider tiles                    | Arrow, Home, End, Enter, Space |

Each adds a `handleTabKeyDown` function that:

- Moves focus between tabs with ArrowRight/ArrowDown and ArrowLeft/ArrowUp
- Jumps to first/last with Home/End
- Sets tabIndex={0} on active tab, tabIndex={-1} on inactive
- Uses data-tab attributes for DOM traversal

**Why unverified**: Model A made these edits while Docker was unavailable. No unit or E2E tests were run.

**To apply**: Diff each file between `model_a/` and `model_b/` and copy the keyboard handler additions. Run accessibility tests after.

## Message Edit/Delete Handlers

Source: `model_a/src/app/(protected)/messages/page.tsx` (+41 lines)

Adds two handlers:

- `handleEditMessage(messageId, newContent)` — calls messageService.editMessage, reloads messages
- `handleDeleteMessage(messageId)` — calls messageService.deleteMessage, reloads messages

Both handle errors and are passed to MessageBubble as `onEditMessage` / `onDeleteMessage` props.

**Why unverified**: Same offline window as the keyboard navigation. The MessageBubble component in B may need prop interface updates to accept these callbacks.

**To apply**: Diff messages/page.tsx between model_a and model_b. Check that MessageBubble's prop types include onEditMessage and onDeleteMessage before wiring them up.
