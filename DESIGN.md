# Checkout Concierge design system

## Direction

Checkout Concierge uses a luxury editorial interface for a trust-first commerce workflow. The visual language is warm, quiet, and architectural: the agent can make discovery feel conversational, but the money boundary stays unmistakable. The agent recommends, the user authorises, and Razorpay verifies.

## Tokens

- Canvas is warm alabaster `#F9F8F6`; primary surfaces stay close to the canvas so structure comes from spacing and lines rather than floating containers.
- Rich charcoal `#1A1A1A` is used for type, dark bands, and affirmative actions. Muted taupe `#EBE5DE` is the supporting surface.
- Gold `#D4AF37` is reserved for focused controls, verified moments, active navigation, and the sliding hover treatment on primary actions.
- Display text uses Playfair Display, with Inter for body and interface text. The local fallback stack preserves the same editorial contrast without requiring a network font.
- Geometry is softly rounded. Cards use a 16px radius, controls use a 12px radius, and compact status tags use a full radius. Borders remain 1px and shadows stay restrained so the interface feels approachable rather than inflated.
- Elevation is intentionally restrained: `0 2px 8px rgb(26 26 26 / 0.03)` for cards and `0 8px 24px rgb(26 26 26 / 0.08)` for lifted states. Shadows support hierarchy instead of creating a soft neumorphic world.

## Composition

- Public landing: a 12-column asymmetric hero, live checkout component preview, dark problem statement, numbered process, safety policy, audit trail, and architecture handoff.
- Workspace: a crisp left rail, compact top bar, an agent-first transcript, explicit approval gate, and an activity drawer that keeps the evidence close to the action.
- Mobile: the left rail becomes a hamburger drawer, the agent remains the primary surface, and content collapses without losing the sequence or the safety explanation.
- Sections use generous vertical spacing and alternating alabaster, taupe, and charcoal fields. Editorial grid lines and oversized sequence numbers provide rhythm without adding decorative noise.

## Components

- Primary buttons use charcoal text treatment with a gold overlay that slides from left to right on hover. Secondary actions begin as transparent line buttons and fill charcoal on hover.
- Inputs are transparent with an underline and a gold focus rule. Quick prompts are compact, rectangular controls rather than pills.
- Status is always written as well as signalled with an icon or color. The test-mode statement remains visible in the shell: no live payments and no real money moves.
- The checkout preview and payment gate keep one obvious affirmative action per surface. The final confirmation is never hidden in a generic chat affordance.

## Motion and accessibility

Motion is deliberate and low amplitude: 300ms ease-out transitions for controls, 400ms entrance movement for sections, and 300ms drawer slides. Only transform, opacity, color, and border properties animate. The paper-noise overlay is fixed and pointer-inert at roughly 2.5% opacity. Reduced-motion users receive no meaningful movement, and focus rings remain visible with a gold offset.
