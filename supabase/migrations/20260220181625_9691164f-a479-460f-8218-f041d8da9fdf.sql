
-- Add phone and promptpay_qr columns to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
ADD COLUMN IF NOT EXISTS promptpay_qr text DEFAULT NULL;

-- Create storage bucket for employee avatars and promptpay QR images
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-assets', 'employee-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employee-assets bucket
CREATE POLICY "Employee assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-assets');

CREATE POLICY "Anyone can upload employee assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employee-assets');

CREATE POLICY "Anyone can update employee assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'employee-assets');

CREATE POLICY "Anyone can delete employee assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'employee-assets');
