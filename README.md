# Pranavi Fashion Content Engine

This repository contains the configuration, database schemas, and automation workflows for the Pranavi Fashion Content Engine.

## Project Structure

*   `/supabase`: Contains SQL migrations to build the database schema and RLS policies, as well as seed data for the Brand Profile and initial tracked sources.
*   `/n8n`: Contains JSON exports of the n8n automation workflows for Daily Research, Deduplication & Scoring, and Draft Generation.
*   `/frontend`: Holds the Control Room interface (currently pending Vercel vs. Retool decision).

## Setup Instructions

1.  Copy `.env.example` to `.env` and fill in the required API keys.
2.  Deploy the Supabase schema using the provided SQL migrations.
3.  Import the n8n workflows into your self-hosted n8n instance.
