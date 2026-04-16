USE biggym;

UPDATE products
SET
  gallery_images_json = CASE
    WHEN gallery_images_json IS NULL OR TRIM(gallery_images_json) IN ('', '[]', 'null')
      THEN '["../assets/images/products/elite-gold-protein/butterscotch.jpg","../assets/images/products/elite-gold-protein/cafe-latte.jpg","../assets/images/products/elite-gold-protein/chocolate-hazelnut.jpg"]'
    ELSE gallery_images_json
  END,
  flavors_json = CASE
    WHEN flavors_json IS NULL OR TRIM(flavors_json) IN ('', '[]', 'null')
      THEN '[{"label":"Butterscotch","image_url":"../assets/images/products/elite-gold-protein/butterscotch.jpg"},{"label":"Cafe Latte","image_url":"../assets/images/products/elite-gold-protein/cafe-latte.jpg"},{"label":"Chocolate Hazelnut","image_url":"../assets/images/products/elite-gold-protein/chocolate-hazelnut.jpg"}]'
    ELSE flavors_json
  END,
  sizes_json = CASE
    WHEN sizes_json IS NULL OR TRIM(sizes_json) IN ('', '[]', 'null')
      THEN '[{"label":"1 kg","price":1290000,"original_price":1490000,"image_url":""},{"label":"2 kg","price":2190000,"original_price":2450000,"image_url":""}]'
    ELSE sizes_json
  END,
  feature_cards_json = CASE
    WHEN feature_cards_json IS NULL OR TRIM(feature_cards_json) IN ('', '[]', 'null')
      THEN '[{"title":"26g Protein","body":"Nguồn đạm tinh gọn cho giai đoạn tăng cơ và phục hồi."},{"title":"2 quy cách","body":"Lựa chọn 1 kg hoặc 2 kg tùy tần suất sử dụng."},{"title":"0g Sugar","body":"Thân thiện hơn cho giai đoạn siết và kiểm soát calo."},{"title":"6g BCAA","body":"Hỗ trợ phục hồi và duy trì hiệu suất sau buổi tập."}]'
    ELSE feature_cards_json
  END,
  quick_info_json = CASE
    WHEN quick_info_json IS NULL OR TRIM(quick_info_json) IN ('', '[]', 'null')
      THEN '[{"label":"Loại sản phẩm","value":"Whey Isolate cao cấp"},{"label":"Mục tiêu","value":"Tăng cơ nạc, phục hồi, bổ sung protein hằng ngày"},{"label":"Khẩu phần","value":"1 muỗng 32g / 71 servings"},{"label":"Bảo quản","value":"Nơi khô ráo, đậy kín sau khi mở nắp"}]'
    ELSE quick_info_json
  END,
  highlights_json = CASE
    WHEN highlights_json IS NULL OR TRIM(highlights_json) IN ('', '[]', 'null')
      THEN '[{"title":"Protein sạch","body":"Tỉ lệ đạm cao trên mỗi serving, ít đường và ít chất béo."},{"title":"Dễ dùng hằng ngày","body":"Dùng sau tập, buổi sáng hoặc như một bữa phụ nhanh."},{"title":"Hợp nhiều mục tiêu","body":"Phù hợp cho bulk sạch, recomp và cut."}]'
    ELSE highlights_json
  END,
  usage_guide_json = CASE
    WHEN usage_guide_json IS NULL OR TRIM(usage_guide_json) IN ('', '[]', 'null')
      THEN '[{"title":"Sau tập","body":"Pha 1 muỗng với 250-300ml nước lạnh và dùng trong vòng 30-60 phút sau buổi tập."},{"title":"Bữa phụ","body":"Dùng vào sáng hoặc chiều khi chưa ăn đủ đạm từ thực phẩm."},{"title":"Mẹo dùng","body":"Có thể pha cùng sữa tách béo, đá lạnh hoặc yến mạch xay để no lâu hơn."}]'
    ELSE usage_guide_json
  END,
  notes_json = CASE
    WHEN notes_json IS NULL OR TRIM(notes_json) IN ('', '[]', 'null')
      THEN '["Không thay thế hoàn toàn bữa ăn chính.","Người dị ứng sữa nên kiểm tra kỹ.","Người có bệnh lý nên hỏi chuyên gia trước khi dùng."]'
    ELSE notes_json
  END
WHERE slug = 'elite-gold-protein';

UPDATE products
SET
  gallery_images_json = CASE
    WHEN gallery_images_json IS NULL OR TRIM(gallery_images_json) IN ('', '[]', 'null')
      THEN '["../assets/images/products/ostrovit-100-whey-protein-isolate/chocolate.png","../assets/images/products/ostrovit-100-whey-protein-isolate/hazelnut-cream.png","../assets/images/products/ostrovit-100-whey-protein-isolate/vanilla-wafers.png"]'
    ELSE gallery_images_json
  END,
  flavors_json = CASE
    WHEN flavors_json IS NULL OR TRIM(flavors_json) IN ('', '[]', 'null')
      THEN '[{"label":"Chocolate","image_url":"../assets/images/products/ostrovit-100-whey-protein-isolate/chocolate.png"},{"label":"Hazelnut Cream","image_url":"../assets/images/products/ostrovit-100-whey-protein-isolate/hazelnut-cream.png"},{"label":"Vanilla Wafers","image_url":"../assets/images/products/ostrovit-100-whey-protein-isolate/vanilla-wafers.png"}]'
    ELSE flavors_json
  END,
  sizes_json = CASE
    WHEN sizes_json IS NULL OR TRIM(sizes_json) IN ('', '[]', 'null')
      THEN '[{"label":"700 g","price":1290000,"original_price":1390000,"image_url":""},{"label":"1800 g","price":2690000,"original_price":2890000,"image_url":""}]'
    ELSE sizes_json
  END,
  feature_cards_json = CASE
    WHEN feature_cards_json IS NULL OR TRIM(feature_cards_json) IN ('', '[]', 'null')
      THEN '[{"title":"25g Protein","body":"Theo công bố của hãng, mỗi serving 30 g cung cấp khoảng 25 g đạm."},{"title":"700 g / 1800 g","body":"Hai quy cách phổ biến đang được bán trên thị trường OstroVit."},{"title":"83% Protein","body":"Tỷ lệ protein cao, phù hợp cho tăng cơ nạc và giữ cơ khi siết."},{"title":"Không thêm đường","body":"Công thức ít béo và dùng chất tạo ngọt ít năng lượng."}]'
    ELSE feature_cards_json
  END,
  quick_info_json = CASE
    WHEN quick_info_json IS NULL OR TRIM(quick_info_json) IN ('', '[]', 'null')
      THEN '[{"label":"Loại sản phẩm","value":"Whey Protein Isolate (WPI)"},{"label":"Mục tiêu","value":"Tăng cơ nạc, phục hồi, bổ sung protein hằng ngày"},{"label":"Khẩu phần","value":"1 serving = 30 g / 23-60 servings tùy quy cách"},{"label":"Bảo quản","value":"Nơi khô ráo, đậy kín sau khi mở nắp"}]'
    ELSE quick_info_json
  END,
  highlights_json = CASE
    WHEN highlights_json IS NULL OR TRIM(highlights_json) IN ('', '[]', 'null')
      THEN '[{"title":"Protein sạch","body":"Tỉ lệ đạm cao trên mỗi serving, ít đường và ít chất béo."},{"title":"Dễ dùng hằng ngày","body":"Dùng sau tập, buổi sáng hoặc như một bữa phụ nhanh."},{"title":"Hợp nhiều mục tiêu","body":"Phù hợp cho bulk sạch, recomp và cut."}]'
    ELSE highlights_json
  END,
  usage_guide_json = CASE
    WHEN usage_guide_json IS NULL OR TRIM(usage_guide_json) IN ('', '[]', 'null')
      THEN '[{"title":"Sau tập","body":"Pha 1 muỗng với 250-300ml nước lạnh và dùng trong vòng 30-60 phút sau buổi tập."},{"title":"Bữa phụ","body":"Dùng vào sáng hoặc chiều khi chưa ăn đủ đạm từ thực phẩm."},{"title":"Mẹo dùng","body":"Có thể pha cùng sữa tách béo, đá lạnh hoặc yến mạch xay để no lâu hơn."}]'
    ELSE usage_guide_json
  END,
  notes_json = CASE
    WHEN notes_json IS NULL OR TRIM(notes_json) IN ('', '[]', 'null')
      THEN '["Không thay thế hoàn toàn bữa ăn chính.","Người dị ứng sữa nên kiểm tra kỹ.","Người có bệnh lý nên hỏi chuyên gia trước khi dùng."]'
    ELSE notes_json
  END
WHERE slug = 'ostrovit-100-whey-protein-isolate';

UPDATE products
SET
  gallery_images_json = CASE
    WHEN gallery_images_json IS NULL OR TRIM(gallery_images_json) IN ('', '[]', 'null')
      THEN '["../assets/images/products/ostrovit-creatine-monohydrate/green-apple.png","../assets/images/products/ostrovit-creatine-monohydrate/watermelon.png","../assets/images/products/ostrovit-creatine-monohydrate/cherry.png"]'
    ELSE gallery_images_json
  END,
  flavors_json = CASE
    WHEN flavors_json IS NULL OR TRIM(flavors_json) IN ('', '[]', 'null')
      THEN '[{"label":"Green Apple","image_url":"../assets/images/products/ostrovit-creatine-monohydrate/green-apple.png"},{"label":"Watermelon","image_url":"../assets/images/products/ostrovit-creatine-monohydrate/watermelon.png"},{"label":"Cherry","image_url":"../assets/images/products/ostrovit-creatine-monohydrate/cherry.png"}]'
    ELSE flavors_json
  END,
  sizes_json = CASE
    WHEN sizes_json IS NULL OR TRIM(sizes_json) IN ('', '[]', 'null')
      THEN '[{"label":"300 g","price":590000,"original_price":690000,"image_url":""},{"label":"500 g","price":850000,"original_price":990000,"image_url":""}]'
    ELSE sizes_json
  END,
  feature_cards_json = CASE
    WHEN feature_cards_json IS NULL OR TRIM(feature_cards_json) IN ('', '[]', 'null')
      THEN '[{"title":"2600 mg Creatine Mono","body":"Một serving 3 g cung cấp hàm lượng creatine monohydrate theo công bố của hãng."},{"title":"300 g / 500 g","body":"Hai quy cách phổ biến đang được bán trên thị trường OstroVit."},{"title":"Không thêm đường","body":"Dạng bột có chất tạo ngọt, phù hợp dùng đều mỗi ngày."},{"title":"Vegan","body":"Phù hợp cho người ưu tiên công thức đơn giản, dễ phối cùng routine hiện có."}]'
    ELSE feature_cards_json
  END,
  quick_info_json = CASE
    WHEN quick_info_json IS NULL OR TRIM(quick_info_json) IN ('', '[]', 'null')
      THEN '[{"label":"Loại sản phẩm","value":"Creatine Monohydrate dạng bột"},{"label":"Mục tiêu","value":"Tăng sức mạnh, công suất và hiệu suất trong các bài tập bùng nổ"},{"label":"Khẩu phần","value":"1 serving = 3 g / 100-166 servings tùy quy cách"},{"label":"Bảo quản","value":"Nơi khô ráo, đậy kín sau khi mở nắp"}]'
    ELSE quick_info_json
  END,
  highlights_json = CASE
    WHEN highlights_json IS NULL OR TRIM(highlights_json) IN ('', '[]', 'null')
      THEN '[{"title":"Nguồn creatine phổ biến","body":"Creatine monohydrate là lựa chọn nền tảng cho cả người mới lẫn người tập lâu năm."},{"title":"Không thêm đường","body":"Công thức đơn giản, dễ ghép với whey hoặc pre-workout hiện tại."},{"title":"Dùng đều mỗi ngày","body":"Có thể dùng sau khi thức dậy, sau tập hoặc cùng một thời điểm cố định trong ngày."}]'
    ELSE highlights_json
  END,
  usage_guide_json = CASE
    WHEN usage_guide_json IS NULL OR TRIM(usage_guide_json) IN ('', '[]', 'null')
      THEN '[{"title":"Liều dùng","body":"Pha 3 g với 100-150 ml nước hoặc nước trái cây."},{"title":"Ngày tập","body":"Dùng 1 serving sau khi thức dậy hoặc sau buổi tập."},{"title":"Ngày nghỉ","body":"Dùng 1 serving vào buổi sáng để giữ nhịp bổ sung đều đặn."}]'
    ELSE usage_guide_json
  END,
  notes_json = CASE
    WHEN notes_json IS NULL OR TRIM(notes_json) IN ('', '[]', 'null')
      THEN '["Không thay thế hoàn toàn bữa ăn chính.","Người dị ứng sữa nên kiểm tra kỹ.","Người có bệnh lý nên hỏi chuyên gia trước khi dùng."]'
    ELSE notes_json
  END
WHERE slug = 'ostrovit-creatine-monohydrate';

UPDATE products
SET
  gallery_images_json = CASE
    WHEN gallery_images_json IS NULL OR TRIM(gallery_images_json) IN ('', '[]', 'null')
      THEN '["../assets/images/products/ostrovit-pump-pre-workout-formula/watermelon.png","../assets/images/products/ostrovit-pump-pre-workout-formula/cherry.png","../assets/images/products/ostrovit-pump-pre-workout-formula/lemon.png","../assets/images/products/ostrovit-pump-pre-workout-formula/orange.png"]'
    ELSE gallery_images_json
  END,
  flavors_json = CASE
    WHEN flavors_json IS NULL OR TRIM(flavors_json) IN ('', '[]', 'null')
      THEN '[{"label":"Watermelon","image_url":"../assets/images/products/ostrovit-pump-pre-workout-formula/watermelon.png"},{"label":"Cherry","image_url":"../assets/images/products/ostrovit-pump-pre-workout-formula/cherry.png"},{"label":"Lemon","image_url":"../assets/images/products/ostrovit-pump-pre-workout-formula/lemon.png"},{"label":"Orange","image_url":"../assets/images/products/ostrovit-pump-pre-workout-formula/orange.png"}]'
    ELSE flavors_json
  END,
  sizes_json = CASE
    WHEN sizes_json IS NULL OR TRIM(sizes_json) IN ('', '[]', 'null')
      THEN '[{"label":"300 g","price":790000,"original_price":890000,"image_url":""},{"label":"500 g","price":990000,"original_price":1150000,"image_url":""}]'
    ELSE sizes_json
  END,
  feature_cards_json = CASE
    WHEN feature_cards_json IS NULL OR TRIM(feature_cards_json) IN ('', '[]', 'null')
      THEN '[{"title":"4200 mg AAKG","body":"Một serving cung cấp nền arginine alpha-ketoglutarate theo công bố của hãng."},{"title":"200 mg Caffeine","body":"Hỗ trợ tỉnh táo và vào guồng nhanh hơn trước buổi tập nặng."},{"title":"300 g / 500 g","body":"Hai quy cách đang bán trên thị trường OstroVit."},{"title":"Không thêm đường","body":"Pre-workout dạng bột với nhiều vị trái cây dễ dùng trước buổi tập."}]'
    ELSE feature_cards_json
  END,
  quick_info_json = CASE
    WHEN quick_info_json IS NULL OR TRIM(quick_info_json) IN ('', '[]', 'null')
      THEN '[{"label":"Loại sản phẩm","value":"Pre-workout dạng bột"},{"label":"Mục tiêu","value":"Tăng tập trung, pump cơ và hiệu suất trước buổi tập"},{"label":"Khẩu phần","value":"1 serving = 10 g / 30-50 servings tùy quy cách"},{"label":"Bảo quản","value":"Nơi khô ráo, đậy kín sau khi mở nắp"}]'
    ELSE quick_info_json
  END,
  highlights_json = CASE
    WHEN highlights_json IS NULL OR TRIM(highlights_json) IN ('', '[]', 'null')
      THEN '[{"title":"8 hoạt chất chính","body":"Kết hợp AAKG, citrulline malate, beta-alanine, taurine và caffeine."},{"title":"Không thêm đường","body":"Dễ lồng vào giai đoạn siết hoặc kiểm soát calo trước buổi tập."},{"title":"Dùng trước tập 30 phút","body":"Hợp cho buổi push, pull, leg day hoặc các phiên cần độ bùng nổ cao."}]'
    ELSE highlights_json
  END,
  usage_guide_json = CASE
    WHEN usage_guide_json IS NULL OR TRIM(usage_guide_json) IN ('', '[]', 'null')
      THEN '[{"title":"Liều dùng","body":"Pha 10 g với 150-200 ml nước hoặc nước trái cây."},{"title":"Trước tập","body":"Dùng 1 serving trước buổi tập khoảng 30 phút."},{"title":"Lưu ý","body":"Có chứa caffeine, không nên dùng muộn trong ngày hoặc chồng với quá nhiều chất kích thích khác."}]'
    ELSE usage_guide_json
  END,
  notes_json = CASE
    WHEN notes_json IS NULL OR TRIM(notes_json) IN ('', '[]', 'null')
      THEN '["Không thay thế hoàn toàn bữa ăn chính.","Người dị ứng sữa nên kiểm tra kỹ.","Người có bệnh lý nên hỏi chuyên gia trước khi dùng."]'
    ELSE notes_json
  END
WHERE slug = 'ostrovit-pump-pre-workout-formula';

UPDATE products
SET
  gallery_images_json = CASE
    WHEN gallery_images_json IS NULL OR TRIM(gallery_images_json) IN ('', '[]', 'null')
      THEN '["../assets/images/products/ostrovit-100-vit-min/tablets.png"]'
    ELSE gallery_images_json
  END,
  flavors_json = CASE
    WHEN flavors_json IS NULL OR TRIM(flavors_json) IN ('', '[]', 'null')
      THEN '[{"label":"Tablets","image_url":"../assets/images/products/ostrovit-100-vit-min/tablets.png"}]'
    ELSE flavors_json
  END,
  sizes_json = CASE
    WHEN sizes_json IS NULL OR TRIM(sizes_json) IN ('', '[]', 'null')
      THEN '[{"label":"30 viên","price":590000,"original_price":690000,"image_url":""},{"label":"90 viên","price":1200000,"original_price":1390000,"image_url":""}]'
    ELSE sizes_json
  END,
  feature_cards_json = CASE
    WHEN feature_cards_json IS NULL OR TRIM(feature_cards_json) IN ('', '[]', 'null')
      THEN '[{"title":"20 hoạt chất","body":"Tổ hợp vitamin và khoáng chất nền tảng cho sinh hoạt và tập luyện hằng ngày."},{"title":"30 / 90 viên","body":"Hai quy cách phổ biến theo sản phẩm đang bán trên thị trường."},{"title":"2 viên / serving","body":"Cách dùng đơn giản, dễ đưa vào routine mỗi ngày."},{"title":"Vegetarian","body":"Dạng viên nén dễ nuốt, hợp cho người cần bổ sung vi chất ổn định."}]'
    ELSE feature_cards_json
  END,
  quick_info_json = CASE
    WHEN quick_info_json IS NULL OR TRIM(quick_info_json) IN ('', '[]', 'null')
      THEN '[{"label":"Loại sản phẩm","value":"Vitamin & khoáng chất tổng hợp"},{"label":"Mục tiêu","value":"Bổ sung vi chất nền tảng cho sinh hoạt, tập luyện và phục hồi"},{"label":"Khẩu phần","value":"1 serving = 2 viên / 15-45 servings tùy quy cách"},{"label":"Bảo quản","value":"Nơi khô ráo, đậy kín sau khi mở nắp"}]'
    ELSE quick_info_json
  END,
  highlights_json = CASE
    WHEN highlights_json IS NULL OR TRIM(highlights_json) IN ('', '[]', 'null')
      THEN '[{"title":"Vitamin & khoáng chất","body":"Chứa các chất như vitamin C, D, E, magnesium, calcium, zinc và iron."},{"title":"Dễ dùng mỗi ngày","body":"Dạng viên nén dễ nuốt, hợp với lịch dùng cố định cùng bữa ăn."},{"title":"Hỗ trợ nền tảng","body":"Phù hợp cho người tập nhiều buổi và người ăn kiêng dễ thiếu vi chất."}]'
    ELSE highlights_json
  END,
  usage_guide_json = CASE
    WHEN usage_guide_json IS NULL OR TRIM(usage_guide_json) IN ('', '[]', 'null')
      THEN '[{"title":"Liều dùng","body":"Dùng 1 serving = 2 viên mỗi ngày cùng bữa ăn."},{"title":"Thời điểm","body":"Uống vào bữa sáng hoặc bữa trưa để dễ duy trì thói quen đều đặn."},{"title":"Lưu ý","body":"Không dùng thay chế độ ăn cân bằng và nên đọc kỹ thành phần nếu có cơ địa nhạy cảm."}]'
    ELSE usage_guide_json
  END,
  notes_json = CASE
    WHEN notes_json IS NULL OR TRIM(notes_json) IN ('', '[]', 'null')
      THEN '["Không thay thế hoàn toàn bữa ăn chính.","Người dị ứng sữa nên kiểm tra kỹ.","Người có bệnh lý nên hỏi chuyên gia trước khi dùng."]'
    ELSE notes_json
  END
WHERE slug = 'ostrovit-100-vit-min';

UPDATE products
SET
  gallery_images_json = CASE
    WHEN gallery_images_json IS NULL OR TRIM(gallery_images_json) IN ('', '[]', 'null')
      THEN '["../assets/images/products/ostrovit-omega-3-extreme/softgel.png"]'
    ELSE gallery_images_json
  END,
  flavors_json = CASE
    WHEN flavors_json IS NULL OR TRIM(flavors_json) IN ('', '[]', 'null')
      THEN '[{"label":"Softgel","image_url":"../assets/images/products/ostrovit-omega-3-extreme/softgel.png"}]'
    ELSE flavors_json
  END,
  sizes_json = CASE
    WHEN sizes_json IS NULL OR TRIM(sizes_json) IN ('', '[]', 'null')
      THEN '[{"label":"90 viên","price":690000,"original_price":790000,"image_url":""},{"label":"180 viên","price":980000,"original_price":1120000,"image_url":""}]'
    ELSE sizes_json
  END,
  feature_cards_json = CASE
    WHEN feature_cards_json IS NULL OR TRIM(feature_cards_json) IN ('', '[]', 'null')
      THEN '[{"title":"1000 mg Fish Oil","body":"Mỗi serving cung cấp hàm lượng dầu cá cao theo công bố của hãng."},{"title":"EPA 500 mg / DHA 250 mg","body":"Tỷ lệ acid béo nổi bật để hỗ trợ tim mạch và chức năng não bộ."},{"title":"90 / 180 viên","body":"Hai quy cách phổ biến trên thị trường OstroVit."},{"title":"Softgel dễ dùng","body":"Dạng viên nang mềm thuận tiện cho việc bổ sung đều đặn mỗi ngày."}]'
    ELSE feature_cards_json
  END,
  quick_info_json = CASE
    WHEN quick_info_json IS NULL OR TRIM(quick_info_json) IN ('', '[]', 'null')
      THEN '[{"label":"Loại sản phẩm","value":"Omega 3 dạng softgel"},{"label":"Mục tiêu","value":"Hỗ trợ tim mạch, chức năng não bộ và nền phục hồi tổng thể"},{"label":"Khẩu phần","value":"1 viên / 90-180 servings tùy quy cách"},{"label":"Bảo quản","value":"Nơi khô ráo, đậy kín sau khi mở nắp"}]'
    ELSE quick_info_json
  END,
  highlights_json = CASE
    WHEN highlights_json IS NULL OR TRIM(highlights_json) IN ('', '[]', 'null')
      THEN '[{"title":"1000 mg dầu cá","body":"Hàm lượng nổi bật cho một serving mỗi ngày."},{"title":"EPA & DHA cao","body":"Giúp bổ sung acid béo không bão hòa quan trọng cho sức khỏe lâu dài."},{"title":"Dùng đơn giản","body":"Chỉ 1 viên sau bữa ăn là đủ cho routine bổ sung cơ bản."}]'
    ELSE highlights_json
  END,
  usage_guide_json = CASE
    WHEN usage_guide_json IS NULL OR TRIM(usage_guide_json) IN ('', '[]', 'null')
      THEN '[{"title":"Liều dùng","body":"Dùng 1 viên mỗi ngày, tốt nhất sau bữa ăn."},{"title":"Duy trì đều","body":"Hiệu quả của omega-3 đến từ việc bổ sung đều đặn trong thời gian dài."},{"title":"Lưu ý","body":"Không dùng nếu dị ứng thành phần từ cá và nên tham khảo chuyên gia nếu có bệnh nền đặc thù."}]'
    ELSE usage_guide_json
  END,
  notes_json = CASE
    WHEN notes_json IS NULL OR TRIM(notes_json) IN ('', '[]', 'null')
      THEN '["Không thay thế hoàn toàn bữa ăn chính.","Người dị ứng sữa nên kiểm tra kỹ.","Người có bệnh lý nên hỏi chuyên gia trước khi dùng."]'
    ELSE notes_json
  END
WHERE slug = 'ostrovit-omega-3-extreme';
