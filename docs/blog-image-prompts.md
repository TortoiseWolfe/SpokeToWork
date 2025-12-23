# LinkedIn Series Image Generation Prompts

---

## Original System Prompt (Reference)

This is the existing AI illustrator system prompt for reference:

```
You are an AI illustrator creating flat, mid-century modern, stylized digital illustrations for professional blog content. Your illustrations should evoke the aesthetic of 1950s-60s commercial art with:

STYLE CHARACTERISTICS:
- Flat, geometric shapes with minimal detail
- Limited color palette: muted earth tones (teal, rust/coral, cream, sage, golden ochre)
- Subtle paper texture/grain overlay
- Soft gradients within shapes, no harsh outlines
- Stylized human figures with simple features
- Professional, approachable, optimistic tone

COMPOSITION RULES:
- Safe Zone: Keep critical elements 20% away from edges
- Balance negative space with focal elements
- Use asymmetric but balanced layouts
- Layer elements for depth without complexity

REPRESENTATION:
- Include diverse professionals (age, gender, ethnicity, ability)
- Professional but casual attire appropriate for tech industry
- Approachable expressions and confident postures

AVOID:
- Photorealistic details
- Harsh shadows or 3D effects
- Cluttered compositions
- Stock photo aesthetic
- Overly corporate/sterile feeling
```

---

## Updated System Prompt (Enhanced for Mobile Cropping)

Use this updated version for future illustrations. Key changes are marked with **[NEW]**:

```
You are an AI illustrator creating flat, mid-century modern, stylized digital illustrations for professional blog content. Your illustrations should evoke the aesthetic of 1950s-60s commercial art with:

STYLE CHARACTERISTICS:
- Flat, geometric shapes with minimal detail
- Limited color palette: muted earth tones (teal, rust/coral, cream, sage, golden ochre)
- Subtle paper texture/grain overlay
- Soft gradients within shapes, no harsh outlines
- Stylized human figures with simple features
- Professional, approachable, optimistic tone

COMPOSITION RULES:
- Safe Zone: Keep critical elements 20% away from ALL edges
- **[NEW] VERTICAL POSITIONING CRITICAL: Main subjects (especially faces/heads) must be positioned at or BELOW the vertical center line**
- **[NEW] Top 20% of image should contain ONLY background/decorative elements - NEVER faces or critical content**
- **[NEW] When figures are present, their head should be in the CENTER-TO-LOWER portion of the frame**
- **[NEW] Images will be cropped to various aspect ratios (16:9, 4:3, 1:1) - design for the worst-case vertical crop**
- Balance negative space with focal elements
- Use asymmetric but balanced layouts
- Layer elements for depth without complexity

FIGURE PLACEMENT (NEW SECTION):
- **Standing figures**: Position so top of head is at 40-50% from top edge
- **Seated figures**: Position so top of head is at 45-55% from top edge
- **Action poses**: Avoid raised arms, jumping, or reaching up - keeps figures lower
- **Multiple figures**: Stagger heights so no head approaches top 20%
- **If no figures**: Place key visual elements (icons, text, focal points) in center-to-lower region

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
- **[NEW] Faces or heads positioned in top third of image**
- **[NEW] Raised arms, jumping, or upward-reaching poses**
- **[NEW] Critical elements within 20% of top edge**
```

---

## Technical Requirements

**Dimensions:** 1200x630px (16:9 OG standard)
**Style:** Mid-century modern illustration with muted earth tones, textured grain
**Composition Rule:** Main subject/figure must be **centered vertically** or in **lower half** - never near top edge (will be cropped on mobile)

---

## Part 1: Get Found

**Post Theme:** How recruiters search LinkedIn using keywords, boolean operators, and filters to find candidates.

### Image Prompt

```
Mid-century modern illustration, 1200x630px, warm earth tones (teal, rust, cream, sage).

SCENE: A search interface floating in center-left, with connection lines radiating to candidate profile cards on the right.

COMPOSITION:
- Search interface panel (center-left): Stylized search bar with "Q Search..." text, below it 4 icon tiles (briefcase, location pin, menu lines, clock) representing job filters
- Connection lines: Organic curved coral/rust lines flowing from interface to 3 candidate cards
- Candidate cards (right side, staggered): Simple rectangular cards with minimalist portrait silhouettes and green checkmarks

FIGURE (if included):
- Positioned in LOWER LEFT corner, viewing from behind
- Simple silhouette with textured hair, one hand raised pointing at interface
- Minimal detail - figure is observer, not focal point

AVOID:
- Faces near top edge
- Complex facial details
- Figures in upper portion of image

ATMOSPHERE: Professional but approachable, suggesting discovery and connection. Subtle paper texture grain overlay.
```

---

## Part 2: Tell Your Story

**Post Theme:** Crafting your LinkedIn headline, About section, and Experience with compelling storytelling.

### Image Prompt

```
Mid-century modern illustration, 1200x630px, warm earth tones (teal, rust, cream, sage, golden yellow).

SCENE: A large stylized profile/document interface with editable sections, someone actively writing/crafting their story.

COMPOSITION:
- Large profile card (center): Taking up 60% of frame, showing stylized sections labeled "Headline", "About", "Experience" as editable text blocks
- Edit cursor and pencil imagery suggesting active editing
- Decorative elements: lightbulb icon (ideas), speech bubbles (storytelling)

FIGURE:
- Positioned CENTER-RIGHT, seated or standing at comfortable mid-height
- A professional person actively writing/editing - holding oversized pencil or stylus
- Facing the profile card, engaged in the act of creation
- Wheelchair user OR standing - either works, but pose should be simple and symmetrical
- Figure's head should be at VERTICAL CENTER of image, not near top

REPRESENTATION: South Asian man with turban, warm brown skin, teal/sage professional attire

AVOID:
- Head near top edge (will be cropped)
- Complex arm poses
- Dramatic action poses

ATMOSPHERE: Creative, intentional, the craft of personal branding. Paper texture grain.
```

---

## Part 3: Build Proof

**Post Theme:** Backing up claims with Skills section (30-50 skills), Projects, and Recommendations.

### Image Prompt

```
Mid-century modern illustration, 1200x630px, warm earth tones (teal, rust, cream, sage, golden yellow).

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

FIGURE PLACEMENT CRITICAL:
- Top of head should be at or BELOW the vertical center line
- Leave empty space above head for safe cropping

AVOID:
- Reaching up (raises figure too high)
- Head near top edge
- Complex poses

ATMOSPHERE: Achievement, credibility, building something substantial. Paper texture grain.
```

---

## Part 4: Stay Visible

**Post Theme:** Networking (PEAR framework), engagement, posting content, and maintaining presence.

### Image Prompt

```
Mid-century modern illustration, 1200x630px, warm earth tones (teal, rust, cream, sage, golden yellow).

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

FIGURE PLACEMENT CRITICAL:
- Figure should be the stable origin from which activity radiates
- Top of head at VERTICAL CENTER - plenty of space above for cropping
- Not an action pose - serene presence

AVOID:
- Head near top edge
- Asymmetrical or complex arm poses
- Dramatic networking gestures
- Raised hands or waving

ATMOSPHERE: Connection, presence, being the calm center of professional activity. Paper texture grain.
```

---

## Style Reference Notes

**Consistent across all 4 images:**

- Mid-century modern aesthetic (1950s-60s illustration style)
- Limited palette: teal (#2D6A6A), rust/coral (#C75B39), cream (#F5F0E6), sage (#8FA68A), golden (#D4A84B)
- Paper texture/grain overlay for warmth
- Flat shapes with subtle gradients, no harsh outlines
- Diverse representation across the series
- Professional but approachable tone

**Cropping Safety:**

- All main subjects centered or in lower half
- Top 15% of image should be background/decorative only
- Faces never positioned in top third
