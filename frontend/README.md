# Frontend README

## NextJS + TailwindCSS + Framer Motion

Premium modern web interface for NoteMind - From Notes to Mastery

### Features

✨ **Premium Design**

- Dark theme with glassmorphism
- Gradient text and animations
- Smooth transitions and micro-interactions
- Responsive design (mobile, tablet, desktop)

🎨 **Components**

- Animated particles background
- Custom cursor glow effect
- Scroll progress bar
- Reusable UI components (GlassCard, Buttons, etc.)
- 3D flip flashcards
- Interactive quiz interface
- Analytics dashboard with charts

⚡ **Performance**

- Static site generation (SSG) where possible
- Image optimization
- Code splitting
- Smooth animations with GPU acceleration

### Tech Stack

- **Next.js 14** - React framework
- **TailwindCSS** - Utility-first CSS
- **Framer Motion** - Animation library
- **Recharts** - Chart library
- **Axios** - HTTP client
- **TypeScript** - Type safety

### Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Project Structure

```
src/
├── components/        # Reusable React components
├── pages/            # Next.js pages (routes)
├── styles/           # Global CSS
└── utils/            # Helper functions & API client
```

### Building Components

All components use:

- **Framer Motion** for animations
- **TailwindCSS** for styling
- **TypeScript** for type safety

Example:

```tsx
import { motion } from "framer-motion";

export default function MyComponent() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 bg-gradient-to-r from-purple-500 to-pink-500"
    >
      Content
    </motion.div>
  );
}
```

### Styling

Uses TailwindCSS with custom configuration:

- Dark theme: `#050505` background
- Accent colors: Purple, Pink, Gold
- Custom glass effect
- Gradient animations

### API Integration

All API calls through `src/utils/api.ts`:

```typescript
import { notesAPI } from "@/utils/api";

const notes = await notesAPI.generate(topic);
```

### Deployment

Deploy to Vercel with zero config:

```bash
vercel deploy --prod
```

### Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

**NoteMind** - From Notes to Mastery
