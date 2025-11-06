# Math Olympiad System - Project TODO

## Core Features
- [x] Token authentication page (OS2J8U)
- [x] Question folder setup and verification (questions/*.png)
- [x] Database schema for olympiad sessions and scores
- [x] Olympiad competition page with 6 rounds
- [x] 30-second difficulty selection timer
- [x] 10-minute question display timer
- [x] Randomized question set generation per device
- [x] Scoring display with difficulty-based points
- [x] Auto-select "Sulit" (Hard) if no selection made
- [x] Timer display in header
- [x] PDC Math Olympiad header branding
- [x] Math Jeopardy page title

## UI Components
- [x] Login/Token entry page
- [x] Competition main page with header
- [x] Difficulty selection modal (30s countdown)
- [x] Question display area with timer
- [x] Score/round information display
- [x] Scoring information (Easy: +5/-1, Medium: +8/-2, Hard: +15/-4)

## Backend
- [x] tRPC procedure for token validation
- [x] tRPC procedure for session initialization
- [x] tRPC procedure for round progression
- [x] Database queries for session management

## Testing & Deployment
- [ ] Test token authentication flow
- [ ] Test round progression and timers
- [ ] Test randomized question sets
- [ ] Verify question images load correctly
- [ ] Test scoring display
