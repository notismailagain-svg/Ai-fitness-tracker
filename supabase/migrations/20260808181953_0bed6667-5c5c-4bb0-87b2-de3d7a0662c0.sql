CREATE POLICY "own photos read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'body-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "own photos insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'body-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own photos delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'body-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));