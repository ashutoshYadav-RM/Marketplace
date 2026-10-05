-- =============================================================================
-- 0012_review_images.sql — photo uploads on reviews.
--
-- Same public-bucket-with-scoped-writes shape as product-images
-- (0003_catalog.sql), but scoped by the uploading customer's own id instead
-- of an org/product path — a review doesn't exist yet at upload time (the
-- same chicken-and-egg as product photos), and unlike an org, "my own user
-- id" is always available before the first write.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do nothing;

create policy "review_images_owner_write" on storage.objects for insert to authenticated with check (
  bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "review_images_owner_delete" on storage.objects for delete to authenticated using (
  bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text
);
