You are a senior AI engineer designing an **AI processing pipeline for an S3 Workspace SaaS**.

Your job is to implement a scalable, async AI pipeline that processes files uploaded to AWS S3 and enriches them with intelligence using Google Gemini.

The pipeline must be production ready, queue-based, and modular.

---

## Objective

When a file is uploaded:

1. Detect file type
2. Extract text/content
3. Generate AI summary
4. Generate categories + keywords
5. Generate embeddings
6. Store results in Supabase
7. Enable semantic search

Processing must run in background workers, not blocking the upload flow.

---

## Tech Requirements

Language:

* Node.js OR Python

Services:

* Supabase client
* Google Gemini API
* Queue system (Trigger.dev / BullMQ / simple Redis queue)

Architecture:

* Event driven
* Idempotent jobs
* Retry safe
* Batch friendly

---

## Pipeline Flow

Event: FILE_UPLOADED

Worker steps:

1. Fetch file metadata from DB
2. Generate temporary signed download URL
3. Download file stream
4. Detect mime type
5. Extract content

Extraction rules:

* PDF → text extraction
* DOC/DOCX → text extraction
* TXT → direct
* Images → OCR optional
* Unsupported → skip summary but still embed filename

6. Send extracted content to Gemini for:

   * summary
   * category suggestion
   * keywords
   * title suggestion

7. Generate embeddings for:

   * full text
   * summary
   * filename

8. Store:

* ai_summary
* ai_category
* ai_keywords
* embedding_id
* processed_at

9. Update file status → processed

---

## Database Fields (files table additions)

* ai_summary (text)
* ai_category (text)
* ai_keywords (json)
* ai_title (text)
* embedding (vector)
* ai_status (pending | processing | done | failed)
* processed_at

---

## Gemini Prompt Design

Create reusable prompts:

1. Summary prompt
2. Categorization prompt
3. Keyword extraction prompt
4. Structured JSON response prompt

Responses must be structured JSON.

Handle large files via chunking + merge summary.

---

## Chunking Strategy

If text > token limit:

* Split into chunks
* Summarize each
* Merge summaries
* Generate final summary

Store chunk embeddings for semantic search.

---

## Embedding Strategy

Generate embeddings for:

* File content
* Summary
* Filename

Store in Supabase vector column.

Implement cosine similarity search.

---

## Semantic Search Endpoint

Input:

* Natural language query

Flow:

* Generate query embedding
* Vector search in Supabase
* Rank results
* Return files with summary snippet

---

## Worker Requirements

* Concurrency control
* Retry on Gemini errors
* Dead letter queue
* Logging
* Cost guardrails (skip huge files)
* Rate limiting

---

## File Size Strategy

* <10MB → full processing
* 10–100MB → chunk
* > 100MB → metadata only + optional manual processing

---

## Observability

Log:

* Processing time
* Tokens used
* Cost estimate
* Failures
* Queue lag

---

## Deliverables

Generate:

1. Worker folder structure
2. Queue setup
3. File extraction utilities
4. Gemini service wrapper
5. Chunking utility
6. Embedding generation
7. DB update functions
8. Semantic search API
9. Retry + error handling
10. Example env variables

Code must be modular and production ready.

Start by generating the worker architecture and queue setup.
