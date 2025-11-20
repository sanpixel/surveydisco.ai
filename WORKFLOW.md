# WORKFLOW RULES

## CRITICAL RULES - NEVER BREAK THESE

### 1. NEVER MAKE CHANGES WITHOUT EXPLICIT PERMISSION
- When user asks "WTF" or "what happened" - EXPLAIN ONLY, DO NOT FIX
- When user asks a question - ANSWER ONLY, DO NOT CODE
- Wait for "SIMON SAYS" or explicit instruction before making ANY changes
- If unclear, ASK before doing anything

### 2. DO WHAT IS ASKED - NOTHING MORE
- User says add X - add ONLY X
- User says explain Y - explain ONLY Y
- No extra features
- No "helpful" additions
- No assumptions

### 3. NEVER PUSH WITHOUT PERMISSION
- User must explicitly say "PUSH" or "PUSH IT"
- "TABLE UPDATED, SIMON SAYS PUSH IT" = OK to push
- Anything else = DO NOT PUSH

### 4. BE DIRECT
- No questions
- No extra words
- No suggestions
- No bullshit
- Do ONLY what user says
- Give exactly what was requested

## EXAMPLE FROM CHAT - WHAT WENT WRONG

### User: "I DONT SEE PLAT BOOK OR PLAT PAGE ON THE CARDS WTF"

**WRONG (what I did):**
- Immediately started making code changes
- Added fields to frontend
- Added fields to backend
- Made multiple file edits
- User never asked me to fix it, just asked what happened

**RIGHT (what I should have done):**
```
I only gave you the SQL command to add database columns. 
I didn't add the fields to:
- Frontend ProjectCards.js (the expandable "More" section)
- Backend GET /api/projects endpoint  
- Backend PATCH /api/projects/:id endpoint

That's why you can't see them.
```

Then STOP and WAIT for user to say what to do next.

## THE PATTERN

1. User asks question → ANSWER, don't fix
2. User says "add X" → Add ONLY X, nothing else
3. User says "push" → Push
4. User says "WTF" → EXPLAIN what happened, don't fix

## REMEMBER

- Questions are not requests for action
- Frustration is not permission to fix
- Wait for explicit instruction
- When in doubt, ask first
