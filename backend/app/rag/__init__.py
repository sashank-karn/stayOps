"""
RAG (Retrieval-Augmented Generation) Pipeline for StayOps AI.

This package implements the complete RAG pipeline for course material ingestion
and question answering:
  - ingestion: PDF, PPTX, DOCX parsing with metadata preservation
  - chunking: Configurable text splitting with overlap
  - embeddings: Embedding generation via configurable providers
  - vectorstore: Persistent ChromaDB vector storage
  - retrieval: Semantic search with configurable top-k
  - generation: Answer generation with citations and fallback handling
"""
