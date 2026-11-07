# Comprehensive Mobile UI/UX Optimization Plan

A complete mobile UI/UX refinement across all screens, modals, filter bars, and manifest lists in Sanzari Tourism, ensuring tap-friendly single-line rows with expandable details, zero horizontal scrolling, and 100% preserved PC desktop layouts.

---

## 1. User Alignment & Core Requirements
- **Scope**: All mobile views and modals across the application (`Tour Bookings`, `Tour Date Folders`, `Passenger Manifest`, `Tour Calculator`, and `Header`).
- **Passenger Lists & Manifest Format**: Compact single-line list rows on mobile that expand upon tap to show full traveler details, payment history, and action buttons.
- **Desktop Integrity**: All PC desktop layouts remain 100% untouched.

---

## 2. Key UX Improvements by Module

### A. Tour Bookings & Passenger Manifest (`TourBookingsView.tsx` & `TourPassengersView.tsx`)
- **Single-Line Expandable Mobile Rows**: Display Date, Booking No, Customer Name, Pax Count, and Baaki Due badge on a clean 1-line mobile row. Tapping expands the card smoothly to show member list, payment history, WhatsApp share, voucher slip, and receive payment buttons.
- **Horizontal Swipe Filter Bar**: Smooth horizontal swipe container for Status pills (`All`, `Paid`, `Due`) and Booked By pills (`All`, `👤 Rizwan`, `👤 Mustak`) with zero line breaks or wrapping issues.

### B. Tour Folder / Batch Detail Modal (`TourBatchDetailModal.tsx`)
- **Header & Manifest Search**: Ensure search bar and action buttons (`+ Book Passenger`, `Download Group PDF`, `Delete Folder`) align responsively on mobile viewports.
- **Expandable Passenger Rows**: Display passenger booking rows as compact single lines with tap-to-expand manifest details.

### C. Tour Fare & Family Cost Calculator Modal (`TourCalculatorModal.tsx`)
- **Mobile Touch Controls**: 100% full-width member age inputs, quick preset chips (`2 Adults`, `2A + 1K`), and couple room surcharge toggle.
- **Sticky Footer Bar**: Fixed bottom breakdown bar on mobile for Live Calculation (`Total Fare`, `Adults Fare`, `Kids Discount`, `Couple Surcharge`) with quick reset and close buttons.

### D. Global Mobile Layout & Header (`Header.tsx` & `App.tsx`)
- **Screen Boundary Discipline**: Enforce strict `max-w-full overflow-x-hidden` across main scroll wrappers so no page ever shifts horizontally on mobile devices.
- **Compact Header Branding**: Ensure portal titles and mobile menu trigger button sit comfortably without overlapping header action buttons.

---

## 3. Proposed Changes by File

| File | Proposed Mobile Fixes |
|---|---|
| `src/components/tourism/TourBookingsView.tsx` | Implement compact 1-line expandable rows for mobile; swipeable filter pills |
| `src/components/tourism/TourBatchDetailModal.tsx` | Responsive search bar, group PDF button, and expandable passenger manifest rows |
| `src/components/tourism/TourCalculatorModal.tsx` | Mobile-friendly 1-column form layout, couple room toggle & sticky live calculation footer |
| `src/components/tourism/TourPassengersView.tsx` | Expandable single-line passenger manifest list with quick phone tap |
| `src/components/common/Header.tsx` | Responsive mobile header with title truncation & compact buttons |

---

## 4. Verification & Build Strategy
1. **Compilation Check**: Co-execute `compile_applet` and `lint_applet` to verify syntax and type safety.
2. **Visual Inspection**: Test modal popups, expandable manifest rows, and filter pills across narrow viewport widths.
