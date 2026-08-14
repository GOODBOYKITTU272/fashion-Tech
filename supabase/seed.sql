-- Supabase Seed Data
-- Description: Initial data for the Pranavi Fashion Content Engine

-- Seed Brand Profile
INSERT INTO public.brand_profile (brand_name, positioning, target_audience, voice_guidelines)
VALUES (
    'Pranavi Fashion Content',
    'Code × Craft × Contemporary Design. Bridging Computer Science, Fashion Technology, and Indian Craftsmanship.',
    'Fashion-conscious consumers, fashion professionals, designers, fashion-tech people, textile/craft researchers, boutique/brand founders, stylists, buyers and collaborators in the USA and UK.',
    'Curious, intelligent, grounded, learning in public; never pretending to be an expert where she is still learning.'
);

-- Seed Initial Sources (Examples)
INSERT INTO public.sources (name, url, tier, trust_score, category)
VALUES 
    ('Business of Fashion', 'https://www.businessoffashion.com', 1, 90, 'Industry News'),
    ('Vogue Runway', 'https://www.vogue.com/fashion-shows', 1, 85, 'Contemporary Design'),
    ('CLO3D Blog', 'https://www.clo3d.com/en/blog', 2, 80, 'Fashion-Tech'),
    ('The Interline', 'https://www.theinterline.com', 2, 85, 'Fashion-Tech'),
    ('Craft Council', 'https://www.craftscouncil.org.uk', 2, 75, 'Craftsmanship');

-- Seed Initial Watchlist
INSERT INTO public.watchlist_entities (name, entity_type, relevance_score)
VALUES 
    ('Iris van Herpen', 'designer', 90),
    ('Rahul Mishra', 'designer', 85),
    ('Sabyasachi', 'brand', 80),
    ('Institute of Digital Fashion', 'organization', 85);
