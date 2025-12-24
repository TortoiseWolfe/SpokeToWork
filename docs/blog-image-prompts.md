# LinkedIn Series Image Generation Prompts

---

## System Prompt

```
You are an AI illustrator creating flat, mid-century modern, stylized digital illustrations for professional blog content. Your illustrations should evoke the aesthetic of 1950s-60s commercial art with:

STYLE CHARACTERISTICS:
- Flat, geometric shapes with minimal detail
- Limited color palette with specific hex values:
  * Teal: #2D6A6A
  * Rust/Coral: #C75B39
  * Cream: #F5F0E6
  * Sage: #8FA68A
  * Golden: #D4A84B
- Subtle paper texture/grain overlay for warmth
- Soft gradients within shapes, no harsh outlines
- Stylized human figures with simple features
- Professional, approachable, optimistic tone
- Mid-century modern aesthetic (1950s-60s illustration style)

COMPOSITION RULES:
- CROPPING WARNING: Blog displays use object-cover CENTER-CROP, removing content from BOTH top AND bottom edges
- Desktop crops ~25% from top AND ~25% from bottom (h-96 container)
- Mobile crops ~35% from top AND ~35% from bottom (h-48 container)
- SAFE ZONE: Only the MIDDLE 50% vertically (25-75% from top) is guaranteed visible
- Nothing important within 160px of top edge OR bottom edge (of 630px height)
- All critical content (text, faces, key elements) must be in the CENTER BAND
- Balance negative space with focal elements
- Use asymmetric but balanced layouts
- Layer elements for depth without complexity

FIGURE PLACEMENT:
- Standing figures: Position ENTIRE figure in middle 50% band (head at 35-50%, feet at 65-75%)
- Seated figures: Position so top of head is at 40-55% from top edge
- CRITICAL: Figures must NOT extend into top 25% OR bottom 25%
- Multiple figures: All heads between 35-50% from top, all feet above 75% from top
- If no figures: Place ALL key visual elements (icons, text, focal points) in center band only

REPRESENTATION:
- Include diverse professionals (age, gender, ethnicity, ability)
- Professional but casual attire appropriate for tech industry
- Approachable expressions and confident postures
- Simple, symmetrical poses preferred over dynamic action poses

AVOID:
- Photorealistic details
- Harsh shadows or 3D effects
- Cluttered compositions
- Stock photo aesthetic
- Overly corporate/sterile feeling
- ANY content in top 25% (will be cropped)
- ANY content in bottom 25% (will be cropped)
- Figures standing at bottom edge (legs will be cut off)
- Text or labels near top or bottom edges
```

---

## Technical Requirements

**Dimensions:** 1200x630px (16:9 OG standard)
**Style:** Mid-century modern illustration with muted earth tones, textured grain
**CRITICAL Composition Rule:** Blog uses `object-cover` CENTER-CROP. Top 25% AND bottom 25% will be cropped. ALL content must be in MIDDLE 50% band (pixels 160-470 from top).

---

## Part 1: Get Found

**Post Theme:** How recruiters search LinkedIn using keywords, boolean operators, and filters to find candidates.

### Image Prompt

```
Mid-century modern illustration, 1200x630px.

PALETTE: Teal (#2D6A6A), Rust (#C75B39), Cream (#F5F0E6), Sage (#8FA68A), Golden (#D4A84B). Paper texture grain overlay.

SCENE: A search interface floating in center-left, with connection lines radiating to candidate profile cards on the right.

COMPOSITION:
- Search interface panel (center-left): Stylized search bar with "Q Search..." text, below it 4 icon tiles (briefcase, location pin, menu lines, clock) representing job filters
- Connection lines: Organic curved coral/rust lines flowing from interface to 3 candidate cards
- Candidate cards (right side, staggered): Simple rectangular cards with minimalist portrait silhouettes and green checkmarks

FIGURE (if included):
- Positioned in CENTER-LEFT, viewing from behind (NOT at bottom edge)
- Figure's waist should be at VERTICAL CENTER of image
- Simple silhouette with textured hair, one hand raised pointing at interface
- Minimal detail - figure is observer, not focal point
- CRITICAL: Figure must be fully within middle 50% band - no legs extending to bottom

CROPPING WARNING:
- Top 25% and bottom 25% WILL BE CROPPED on blog display
- Keep figure's head above 35% line, feet above 70% line
- All UI elements (search bar, cards) must be in middle band

AVOID:
- Figure standing at bottom edge (legs will be cut off)
- Complex facial details
- Any content near top or bottom edges

ATMOSPHERE: Professional but approachable, suggesting discovery and connection. Subtle paper texture grain overlay.
```

---

## Part 2: Tell Your Story

**Post Theme:** Crafting your LinkedIn headline, About section, and Experience with compelling storytelling.

### Image Prompt

```
Mid-century modern illustration, 1200x630px.

PALETTE: Teal (#2D6A6A), Rust (#C75B39), Cream (#F5F0E6), Sage (#8FA68A), Golden (#D4A84B). Paper texture grain overlay.

SCENE: A large stylized profile/document interface with editable sections, someone actively writing/crafting their story.

COMPOSITION:
- Large profile card (center): Taking up 60% of frame, showing ONLY "About" and "Experience" sections as editable text blocks
- DO NOT include "Headline" text - it would be cropped off at top
- Profile card should START at 30% from top edge (not near top)
- Edit cursor and pencil imagery suggesting active editing
- Decorative elements: lightbulb icon (ideas), speech bubbles (storytelling) - position in CENTER band

FIGURE:
- Positioned CENTER-RIGHT at VERTICAL MIDDLE of image
- A professional person actively writing/editing - holding oversized pencil or stylus
- Facing the profile card, engaged in the act of creation
- Figure's head should be at 40-50% from top, feet at 65-70% from top
- CRITICAL: Entire figure must be within middle 50% band

CROPPING WARNING:
- Top 25% and bottom 25% WILL BE CROPPED on blog display
- The "Headline" label would be cropped - show only "About" and "Experience"
- All decorative elements must be in middle band

REPRESENTATION: South Asian man with turban, warm brown skin, teal/sage professional attire

AVOID:
- Any text labels near top edge (will be cropped)
- Figure extending to bottom edge
- Complex arm poses

ATMOSPHERE: Creative, intentional, the craft of personal branding. Paper texture grain.
```

---

## Part 3: Build Proof

**Post Theme:** Backing up claims with Skills section (30-50 skills), Projects, and Recommendations.

### Image Prompt

```
Mid-century modern illustration, 1200x630px.

PALETTE: Teal (#2D6A6A), Rust (#C75B39), Cream (#F5F0E6), Sage (#8FA68A), Golden (#D4A84B). Paper texture grain overlay.

SCENE: A person building/stacking evidence blocks - visual metaphor for accumulating proof and credentials.

COMPOSITION:
- Stack of credential blocks (CENTER-LEFT): Colorful rectangular blocks labeled with skill icons (code brackets, database, gear, star, thumbs up)
- Each block slightly different size, creating a stable pyramid/tower structure
- Decorative elements: "+1" badges, checkmarks, endorsement symbols floating nearby

FIGURE:
- Positioned CENTER-RIGHT at VERTICAL MIDDLE of image
- Actively placing or organizing a block onto the stack
- Standing pose, arms at natural height (not raised above head)
- Confident, accomplished expression

REPRESENTATION: Black woman with natural hair (locs, afro, or braids), golden/ochre headwrap or accessories, teal blazer

CROPPING WARNING:
- Top 25% and bottom 25% WILL BE CROPPED on blog display
- Figure's head at 40-50% from top, feet at 65-75% from top
- Block stack must be fully within middle 50% band
- No blocks extending to top or bottom edges

AVOID:
- Reaching up (raises figure too high)
- Figure or blocks near top/bottom edges
- Complex poses

ATMOSPHERE: Achievement, credibility, building something substantial. Paper texture grain.
```

---

## Part 4: Stay Visible

**Post Theme:** Networking (PEAR framework), engagement, posting content, and maintaining presence.

### Image Prompt

```
Mid-century modern illustration, 1200x630px.

PALETTE: Teal (#2D6A6A), Rust (#C75B39), Cream (#F5F0E6), Sage (#8FA68A), Golden (#D4A84B). Paper texture grain overlay.

SCENE: A person at the calm center of a radiating network of engagement - posts, comments, connections flowing outward.

COMPOSITION:
- Radiating elements (surrounding figure): Chat bubbles, heart/like icons, comment symbols, small profile avatars, connection lines - all flowing outward in gentle arcs
- Elements should be distributed evenly around the figure, creating a sense of active but manageable activity
- Subtle notification badges, share arrows

FIGURE (The Active Participant):
- Positioned at EXACT CENTER of image, vertically and horizontally
- Standing with arms naturally at sides or subtle welcoming gesture - both hands visible and symmetrical
- Relaxed confidence, calm center point

REPRESENTATION: Older professional woman (60s), silver/gray natural curly hair, warm brown skin, sage green blazer over cream top. Distinguished and approachable.

CROPPING WARNING:
- Top 25% and bottom 25% WILL BE CROPPED on blog display
- Figure's head at 40-50% from top, feet at 65-75% from top
- All radiating elements must be within middle 50% band
- Figure is the stable center from which activity radiates

AVOID:
- Head or feet near edges (will be cropped)
- Asymmetrical or complex arm poses
- Dramatic networking gestures
- Radiating elements extending to top/bottom edges

ATMOSPHERE: Connection, presence, being the calm center of professional activity. Paper texture grain.
```
