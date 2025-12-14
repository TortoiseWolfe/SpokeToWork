# Screenshot Capture Guide for Job Seeker Blog Post

This guide walks you through capturing screenshots demonstrating the "Acme Corporation" demo flow for the new blog post.

## Prerequisites

1. SpokeToWork running locally: `docker compose up`
2. Logged in with a test account
3. A screenshot tool (built-in or Snagit/CleanShot)

## Screenshots to Capture

### 1. Add Company Form (`add-company-form.png`)

**Location:** Companies page > Click "Add Company"

**Capture this:**

- The full company form visible
- Fill in these exact values before capture:
  - Company Name: `Acme Corporation`
  - Address: `123 Innovation Drive, Tech City, CA 94000`
  - Website: `https://acme-corp.example.com`
  - Phone: `(555) 123-4567`
  - Contact Name: `Sarah Johnson`
  - Contact Title: `HR Manager`
  - Email: `sarah.johnson@acme-corp.example.com`
  - Status: `Not Contacted`
  - Priority: `3`
  - Notes: `Spoke with Sarah at job fair on 12/10. She mentioned they're expanding the delivery team in January.`

**Dimensions:** 800px wide, capture full form height
**Save to:** `public/blog-images/getting-started-job-hunt-companion/add-company-form.png`

---

### 2. Companies List (`companies-list.png`)

**Location:** Companies page (after saving Acme)

**Setup:**
Add 2-3 example companies total:

1. Acme Corporation (status: Contacted, priority: 3)
2. TechStart Inc (status: Not Contacted, priority: 2)
3. Local Delivery Co (status: Follow Up, priority: 1)

**Capture this:**

- The company table showing all three companies
- Visible columns: Name, Status, Priority, Latest Application

**Dimensions:** 900px wide
**Save to:** `public/blog-images/getting-started-job-hunt-companion/companies-list.png`

---

### 3. Add Application Form (`add-application.png`)

**Location:** Click Acme Corporation > Click "Add Application"

**Fill in these values:**

- Position Title: `Delivery Driver`
- Date Applied: `December 14, 2025`
- Status: `Applied`
- Notes: (leave empty)

**Capture this:**

- The application form modal
- All fields visible

**Dimensions:** 600px wide
**Save to:** `public/blog-images/getting-started-job-hunt-companion/add-application.png`

---

### 4. Route Sidebar (`route-sidebar.png`)

**Location:** Companies page, sidebar visible (desktop view)

**Setup:**

1. Create a route named "Downtown Job Search - Week 1"
2. Add Acme Corporation to the route
3. Add one other company
4. Mark Acme with "Next" flag

**Capture this:**

- The route sidebar showing:
  - Route name
  - List of companies on route
  - "Next" badge on Acme

**Dimensions:** 300px wide (sidebar width)
**Save to:** `public/blog-images/getting-started-job-hunt-companion/route-sidebar.png`

---

### 5. Map View (`map-view.png`)

**Location:** Click "View Map" button

**Setup:**

- Have at least 2 companies with valid addresses
- Active route selected

**Capture this:**

- Map showing company markers
- Route line between stops (if visible)
- Sidebar with company list

**Dimensions:** 1000px wide
**Save to:** `public/blog-images/getting-started-job-hunt-companion/map-view.png`

---

### 6. Featured Image (`featured-og.png` and `featured-og.svg`)

**Create in design tool (Figma, Canva, etc.)**

**Specifications:**

- Dimensions: 1200x630 pixels (OG standard)
- Content suggestions:
  - SpokeToWork logo or text
  - Title: "Your Job Hunt Companion"
  - Visual showing company cards, checklist, or map pins
  - Clean, professional look (use DaisyUI colors)
- Colors: Use the current theme's primary/secondary colors

**Save to:**

- `public/blog-images/getting-started-job-hunt-companion/featured-og.png`
- `public/blog-images/getting-started-job-hunt-companion/featured-og.svg` (optional vector version)

---

## Image Optimization

After capturing, optimize for web:

```bash
# Check file sizes
ls -la public/blog-images/getting-started-job-hunt-companion/

# Target sizes:
# - PNG screenshots: <200KB each
# - Featured OG image: <300KB
# - SVG: <50KB
```

You can use online tools like:

- [Squoosh](https://squoosh.app/) - Google's image compressor
- [TinyPNG](https://tinypng.com/) - PNG/JPEG compression
- [SVGOMG](https://jakearchibald.github.io/svgomg/) - SVG optimizer

---

## Verification Checklist

After capturing all screenshots:

- [ ] `add-company-form.png` - Shows Acme data in form
- [ ] `companies-list.png` - Shows multiple companies with varied statuses
- [ ] `add-application.png` - Shows application form for Acme
- [ ] `route-sidebar.png` - Shows route with companies
- [ ] `map-view.png` - Shows map with markers and route
- [ ] `featured-og.png` - 1200x630, professional design
- [ ] All images under target sizes
- [ ] Images placed in `public/blog-images/getting-started-job-hunt-companion/`

---

## Testing the Blog

After adding screenshots, verify the blog renders correctly:

```bash
# Start dev server
docker compose exec spoketowork pnpm run dev

# Visit in browser
http://localhost:3000/blog
http://localhost:3000/blog/getting-started-job-hunt-companion
```

Check that:

- Images load correctly
- Alt text displays on hover
- No broken image icons
- Post appears in blog listing
