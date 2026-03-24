Product Requirements Document (PRD): AI-Powered Packing List App
1. Product Overview
A mobile-first web application designed to eliminate the mental load of packing, specifically tailored for families and frequent travelers. The app uses an LLM (Large Language Model) to generate highly contextual packing lists based on traveler profiles (ages), destination weather, custom item libraries with conditional tagging, and historical trip data (hindsight feedback).
2. Core Epics & Features
Epic 1: User Accounts & Collaboration
 * Authentication: Users must be able to sign up and log in (Google OAuth preferred for low friction, with Email/Password fallback).
 * User Profile & Settings: Users can set a Default Origin (e.g., home city or home airport). This provides baseline context for travel distance, domestic vs. international travel, and likely modes of transportation.
 * Multiplayer Mode: Users can invite a partner/collaborator to a specific "Trip." Both users can view the checklist and check off items in real-time, with database syncing (e.g., via WebSockets or real-time listeners like Supabase).
Epic 2: Profiles & Item Library Management
 * Traveler Profiles: Users can create profiles for family members containing:
   * Name
   * Age (crucial for the LLM to understand baby vs. toddler vs. adult needs)
   * Gender
   * Relationship (e.g., self, partner, child)
 * Global Item Library: A user-managed database of custom items (e.g., "Slumberpod", "Blue Bunny Lovie").
 * Smart Tagging & Conditional Logic: Items in the library can be tagged with rules that dictate when they are included in the LLM prompt context:
   * Weather constraints (e.g., "Only if sunny/warm", "Only if snowing").
   * Trip type (e.g., "Work trip only", "Family vacation").
   * Always pack (e.g., "Lovie").
   * Assigned to (e.g., assigned specifically to "Tommy").
Epic 3: Trip Creation & Context Gathering
 * Trip Details: Users create a trip by entering:
   * Origin (Autofills from User Profile's Default Origin, but can be manually overridden)
   * Destination
   * Travel Dates
   * Trip Type/Template (e.g., Work, Beach Vacation, Camping)
   * Selected Travelers (picking from the Profiles created in Epic 2)
 * Bag Configuration: Users can define the luggage available for the trip (e.g., "Dad's Carry-on", "Shared Checked Bag", "Diaper Bag", "Kid's Backpack") and optionally assign them to specific traveler profiles.
 * Weather API Integration: The app automatically fetches the weather forecast for the destination during the specified dates and passes this summary (e.g., "Highs in 80s, raining on Tuesday") to the LLM.
 * Template Referencing: Users can select a past trip to use as a baseline context.
Epic 4: LLM Engine & Generation
 * Backend Managed LLM: The app securely manages the LLM API keys (e.g., OpenAI or Gemini) on the backend.
 * Prompt Construction: The backend constructs a complex prompt containing:
   * Origin & Destination (crucial for the LLM to infer travel mode, flight necessities, and international requirements like passports/adapters).
   * Destination Weather forecast.
   * Traveler ages, names, genders, and relationships.
   * Available Bags (so the LLM can make initial smart guesses on where things should go, e.g., passports in carry-on, large liquids in checked).
   * Filtered items from the user's Item Library (based on tags matching the current trip's weather/type).
   * Hindsight Context (items to explicitly exclude based on past trip feedback).
 * Structured Output: The LLM must be instructed to return a structured format (JSON) so the app can render dynamic UI elements, including suggested bag assignments.
Epic 5: Interactive Checklist UI
 * Dynamic Categorization: The checklist must group items logically based on LLM output and item attributes:
   * By Bag (Checked Bag, Dad's Carry-on, Diaper Bag) - Default View
   * By Person (Dad's Items, Kid's Items)
   * By Category (Toiletries, Electronics, Clothing)
   * By Timing (Pack in advance, Morning of departure, Buy at destination/Snacks).
   * Users can toggle these views easily.
 * Interactivity & Reassignment: * Tap to check/uncheck items.
   * Swipe to delete or manually add items the LLM missed.
   * Easily reassign an item from one bag to another (e.g., moving heavy shoes from a carry-on to a checked bag).
 * Progress Indicators: * Global Trip Progress bar (e.g., "75% Packed").
   * Individual Traveler Rings (e.g., "Kid 1: 100%, Dad: 50%").
   * Individual Bag Rings (e.g., "Checked Bag: 100% packed").
 * Printability: A cleanly formatted, printer-friendly CSS view for users who prefer physical lists.
Epic 6: Post-Trip "Hindsight" Review
 * Feedback Loop: After the trip dates have passed, the app prompts the user: "What didn't you use?"
 * Context Saving: Users can select items they packed but didn't need. This data is saved to the trip/item record.
 * Future Prevention: When generating a list for a similar future trip (e.g., same destination or weather type), the app explicitly instructs the LLM: "The user did not use [Item] last time they went to [Destination], consider omitting it."
3. High-Level Data Model (Suggested)
 * Users: id, email, name, default_origin
 * Profiles (Travelers): id, user_id, name, age, gender, relationship
 * Items (Library): id, user_id, name, assigned_profile_id (optional), weather_tag, trip_type_tag, always_pack (boolean)
 * Trips: id, user_id, origin, destination, start_date, end_date, weather_summary, collaborator_ids
 * Bags: id, trip_id, name, type (checked, carry-on, personal item), owner_profile_id (optional)
 * Checklist_Items: id, trip_id, item_name, category, timing_attribute, assigned_profile_id, bag_id, is_checked (boolean), was_unused (boolean - updated post-trip)
4. Non-Functional Requirements & Architecture
 * Strict Separation of Concerns: The application must cleanly separate the frontend UI presentation layer from the backend API/Business Logic layer.
 * Tech Stack Mandate (For AI generation consistency):
   * Frontend: Next.js (App Router), React, Tailwind CSS, and Strict TypeScript.
   * Backend: FastAPI (Python). Must utilize strict type checking via Pydantic models for all API endpoints to prevent hallucinated data structures and ensure seamless LLM integrations.
   * Database/Auth: Supabase (PostgreSQL) recommended for strict relational data modeling, built-in auth, and real-time multiplayer WebSocket capabilities.
 * Code Quality & Modularity: Follow opinionated framework best practices. Avoid monolithic files; utilize smaller, composable components and discrete service files for LLM/Weather integrations.
 * Mobile-First Design: The UI must be highly optimized for one-handed mobile use (large tap targets for checkboxes, bottom navigation if applicable).
 * State Management: Optimistic UI updates for checking off items so the app feels instant, even if the database sync takes a fraction of a second.
 * UI/UX Aesthetics: The interface must be polished, modern, and stylish. It should look and feel slick, utilizing modern UI patterns, smooth animations, and premium visual design.
 * 
