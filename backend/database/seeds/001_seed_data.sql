USE biggym;

INSERT INTO users (full_name, email, password_hash, phone, role)
VALUES
  ('Admin BigGym', 'admin@biggym.local', '$2a$10$h6P8Qd39wMAn7rR5mUQxLuPDBI0lp4rWuIwoMvVJE9idhraNEnNhW', '0900000000', 'admin')
AS new
ON DUPLICATE KEY UPDATE full_name = new.full_name;

INSERT INTO exercises (
  title, slug, category_name, category_slug, level_name, level_slug,
  equipment, primary_muscles, hero_image, short_description, long_description, video_url
) VALUES
  ('Barbell Back Squat', 'barbell-back-squat', 'Chân', 'chan', 'Nâng cao', 'nang-cao', 'Thanh đòn Olympic, squat rack', 'Đùi trước, mông, core', '../assets/images/exercise/exercise-barbell-back-squat.jpg', 'Bài nền tảng để phát triển sức mạnh thân dưới.', 'Barbell Back Squat giúp xây nền sức mạnh thân dưới, tăng kiểm soát và khả năng tạo lực tổng thể.', 'https://www.youtube.com/embed/SW_C1A-rejs'),
  ('Hanging Knee Raise', 'hanging-knee-raise', 'Core', 'core', 'Trung bình', 'trung-binh', 'Xà đơn hoặc ghế treo tay', 'Bụng dưới, core', '../assets/images/exercise/exercise-hanging-knee-raise.jpg', 'Bài tăng sức mạnh bụng dưới và gập hông.', 'Hanging Knee Raise phù hợp để tăng ổn định thân giữa và hỗ trợ các bài kéo, squat, deadlift.', 'https://www.youtube.com/embed/RMtlbOIBAY0'),
  ('Incline Dumbbell Press', 'incline-dumbbell-press', 'Ngực', 'nguc', 'Trung bình', 'trung-binh', 'Ghế incline, dumbbell', 'Ngực trên, vai trước, tay sau', '../assets/images/exercise/exercise-incline-dumbbell-press.jpg', 'Bài nhấn mạnh ngực trên và vai trước.', 'Incline Dumbbell Press giúp cải thiện cân bằng hai bên và xây phần ngực trên đầy hơn.', 'https://www.youtube.com/embed/8iPEnn-ltC8'),
  ('Lateral Raise', 'lateral-raise', 'Vai', 'vai-tay', 'Cơ bản', 'co-ban', 'Dumbbell hoặc cable', 'Vai giữa', '../assets/images/exercise/exercise-lateral-raise.jpg', 'Bài cô lập vai giữa hiệu quả.', 'Lateral Raise phù hợp để làm vai ngang và rõ nét hơn khi tập đúng biên độ.', 'https://www.youtube.com/embed/3VcKaXpzqRo'),
  ('Leg Press 45 Degree', 'leg-press-45-degree', 'Chân', 'chan', 'Trung bình', 'trung-binh', 'Máy leg press 45 độ', 'Đùi trước, mông', '../assets/images/exercise/exercise-leg-press-45-degree.jpg', 'Tăng volume chân an toàn.', 'Leg Press 45 Degree cho phép dồn khối lượng tập lớn vào chân mà vẫn giảm yêu cầu giữ thăng bằng.', 'https://www.youtube.com/embed/IZxyjW7MPJQ'),
  ('Romanian Deadlift', 'romanian-deadlift', 'Chân', 'chan', 'Nâng cao', 'nang-cao', 'Thanh đòn hoặc dumbbell', 'Đùi sau, mông, lưng dưới', '../assets/images/exercise/exercise-romanian-deadlift.jpg', 'Hip hinge chuẩn để phát triển thân sau.', 'Romanian Deadlift là bài chủ lực để phát triển đùi sau, mông và cải thiện khả năng hip hinge.', 'https://www.youtube.com/embed/jEy_czb3RKA'),
  ('Seated Cable Row', 'seated-cable-row', 'Lưng', 'lung', 'Trung bình', 'trung-binh', 'Máy kéo cáp, tay cầm row', 'Lưng giữa, xô, tay trước', '../assets/images/exercise/exercise-seated-cable-row.jpg', 'Bài kéo ngang hiệu quả cho lưng giữa.', 'Seated Cable Row giúp xây lưng dày hơn và cải thiện khả năng siết bả vai.', 'https://www.youtube.com/embed/GZbfZ033f74'),
  ('Walking Lunge', 'walking-lunge', 'Chân', 'chan', 'Trung bình', 'trung-binh', 'Bodyweight hoặc dumbbell', 'Đùi trước, mông, core', '../assets/images/exercise/exercise-walking-lunge.jpg', 'Bài unilateral tốt cho chân và thăng bằng.', 'Walking Lunge giúp hai bên chân làm việc độc lập và cải thiện kiểm soát vận động.', 'https://www.youtube.com/embed/QOVaHwm-Q6U'),
  ('Weighted Pull-up', 'weighted-pull-up', 'Lưng', 'lung', 'Nâng cao', 'nang-cao', 'Xà đơn, dây đai treo tạ hoặc tạ kẹp', 'Lưng xô, tay trước, core', '../assets/images/exercise/exercise-weighted-pullup.jpg', 'Biến thể pull-up để tăng lực kéo mạnh.', 'Weighted Pull-up phù hợp để phát triển lưng xô, tay trước và sức mạnh kéo tổng thể.', 'https://www.youtube.com/embed/L6ndoM3jNKM?si=EyuyNbu5GRdo51HV')
AS new
ON DUPLICATE KEY UPDATE title = new.title;
