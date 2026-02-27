You are a senior full-stack engineer and AI architect.

Your task is to build a production-ready **AI Powered S3 Workspace SaaS**.

The application allows users to connect their AWS S3 bucket and manage files through a modern file explorer UI with AI features powered by Google Gemini.

Use clean architecture, scalable patterns, and modern best practices.

---

### Tech Stack

Frontend:

* Next.js (App Router)
* Tailwind CSS
* shadcn UI
* React Query
* Zustand (light state)

Backend:

* Node.js with Fastify (or Next.js API routes if simpler)
* AWS SDK v3
* Supabase client

Database:

* Supabase Postgres

AI:

* Google Gemini API

Deployment:

* Frontend → Vercel
* Backend workers → VPS

---

### Core Features (MVP)

1. AWS Connection

* Connect S3 bucket using Access keys OR Role ARN
* Validate connection
* Store credentials encrypted

2. File Manager

* Upload via signed URLs
* Download
* Delete
* Rename
* Move
* Folder navigation
* File preview

3. Folder Simulation

* Interpret S3 keys as folder tree
* Breadcrumb navigation
* Lazy loading for large buckets

4. Metadata Layer

* Categories
* Tags
* Notes
* Activity history

5. Dashboard

* Storage usage
* File type distribution
* Recent uploads
* Largest folders

---

### Upload Flow

* Frontend requests upload session
* Backend generates S3 key + signed URL
* Frontend uploads directly to S3
* Backend finalizes metadata
* Trigger async AI processing

---

### Database Schema

Tables:

* users
* aws_connections
* files
* folders
* activities

Files table must include:

* s3_key
* folder_path
* mime
* size
* category
* tags
* ai_summary
* embedding_id

Enable Supabase Row Level Security.

---

### AI Pipeline (Gemini)

After upload:

* Detect file type
* Extract text (PDF, doc, images OCR optional)
* Send to Gemini for:

  * summary
  * category suggestion
  * keywords
* Store results
* Generate embeddings for semantic search

Add natural language search endpoint.

---

### API Endpoints

Auth:

* signup
* login

AWS:

* connect
* validate

Files:

* create upload URL
* finalize upload
* list
* delete
* rename
* move

Folders:

* tree
* create

Dashboard:

* analytics summary

AI:

* process file
* semantic search

---

### UI Requirements

Create a modern workspace UI similar to a cloud drive:

Layout:

* Sidebar folder tree
* Top search + breadcrumb
* File grid/list toggle
* Right metadata panel

Include:

* Drag drop upload
* Context menu
* Multi select
* Dark mode ready

---

### Architecture Rules

* Files never pass through backend
* Always use signed URLs
* Background worker for AI
* Separate metadata from storage
* Pagination for large buckets
* Modular services (s3Service, aiService, fileService)

---

### Folder Structure

apps/web → Next.js app
apps/api → backend routes
packages/ui → shared UI
packages/lib → services (s3, ai, db)
workers/ai → background AI jobs

---

### Deliverables

Generate:

1. Repo folder structure
2. Supabase SQL schema
3. Core backend services
4. Signed URL upload implementation
5. Folder tree builder utility
6. File explorer UI components
7. AI processing worker
8. Semantic search endpoint
9. Example environment variables
10. README with setup steps

Write clean, typed code with comments.

Prioritize MVP but keep architecture extensible for SaaS scale.

Start by generating the repository structure and Supabase schema.
