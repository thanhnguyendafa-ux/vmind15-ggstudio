Vmind1.5 — Design Analysis (Technical Markdown, no code)
0. Tóm tắt

Vmind1.5 là webapp học từ vựng dựa trên hàng đợi luyện tập (Study Queue), thống kê chi tiết, và gamification. Hệ thống hỗ trợ Offline (IndexedDB) và Online (Supabase qua Google OAuth), kiến trúc incremental build (không ghi đè; nhận diện bằng data-wf-id). Danh mục tính năng dưới đây giữ nguyên logic từ đặc tả gốc, trình bày theo góc nhìn sản phẩm/thiết kế.

1. Mục tiêu & Phi chức năng

Mục tiêu: giúp người học ghi nhớ bằng cơ chế “đúng hai lần liên tiếp thì ra khỏi hàng đợi”, đồng thời theo dõi tiến bộ qua thống kê/XP/badge.

Hiệu năng: lazy-load (xem trước 5 dòng mỗi bảng), danh sách ảo hóa.

Tính ổn định dữ liệu: duy trì cột mặc định, commit kết quả chỉ khi hoàn tất phiên.

Khả dụng: hỗ trợ nhập/xuất CSV, sao lưu tự động/ thủ công; giải quyết xung đột dữ liệu khi chuyển chế độ.

2. Mô hình bảng & cột

Người dùng tạo nhiều bảng; cột do người dùng định nghĩa (thêm/xóa).

Cột #1 = keyword (khóa chính, duy nhất; kiểm tra khi tạo/nhập).

Cột mặc định (tự tạo, không xóa, ghim cuối): Tags(multi), Passed1, Passed2, Failed, TotalAttempt, SuccessRate, FailureRate, RankPoint, Level, InQueue, QuitQueue, LastPracticeDate.

Hiển thị: toggle Show/Hide, Sort/Filter/Group đa tầng, Bulk Tag.

Reset thống kê theo hàng để “học lại”.

CSV: file phải khớp số cột hiện tại; xung đột khóa: Merge / Overwrite / Add-new-only / View-only.

3. Relation (Q–A Mapping)

Bắt buộc có ít nhất một Relation trước khi Study (thiếu → cảnh báo/hướng dẫn).

Cấu hình: QuestionCols(1..n), AnswerCols(1..n); chế độ hỏi: MCQ / TF / Typing.

Định danh: UserLabel (MCQ,TF,Typing).

Hiển thị Q/A: mỗi dòng ColumnName: Value.

Info: xem cấu hình + preview.

Random Relation: khi chọn nhiều, ngẫu nhiên theo câu và đảm bảo mỗi relation đã chọn xuất hiện ít nhất một lần trong một queue.

Make Relations: toggle danh sách relation của bảng hiện tại.

4. Luồng học (5 bước) — Thiết kế màn Study Wizard

Chọn 1..n bảng (nếu chưa có → gợi ý tạo).

Chọn mode: MCQ/TF/Typing (≥2 → cho phép random).

Chọn relation hoặc bật Random Relation (khóa danh sách).

Chọn chiến lược chọn từ (tối đa 3 lớp ưu tiên):
PriorityScore, lowest RankPoint, lowest SuccessRate, longest DaysSincePractice, ưu tiên QuitQueue=true, low InQueue.
Có thể cho phép Manually Choose sau khi lọc/sắp xếp.

Chọn số lượng: 5 / 7 / 10 / 15 (tối thiểu 5). Có thể lấy từ nhiều bảng; cảnh báo thiếu.

Preview: toggle danh sách; thao tác Remove / Add / Shuffle.

UX phụ trợ: luôn có toggle Table để tiết kiệm chỗ; người dùng có thể lọc/sắp xếp rồi chọn thủ công hoặc bấm nhanh vào các hộp 5/7/10/15.

Start bắt đầu phiên.

5. Hàng đợi học (Core Learning)

Kích thước queue: 5/7/10/15.

Sai → đẩy mục tới vị trí y+2; trạng thái tạm Fail.

Đúng lần 1 → trạng thái Pass1; đẩy cuối hàng.

Đúng lần 2 → Pass2; loại khỏi hàng.

Không có “Submit”; phiên kết thúc khi mọi từ đạt Pass2.

Commit khi hoàn tất:

Theo hàng: cập nhật Passed1/Passed2/Failed/TotalAttempt/RankPoint/SuccessRate/FailureRate/Level, tăng InQueue, đặt LastPracticeDate.

Toàn cục: tăng InQueueReal.

Thoát giữa chừng: không commit Pass/Fail/RankPoint; đặt QuitQueue=true cho mục chưa Pass2; tăng QuitQueueReal; cảnh báo khi đóng tab/điều hướng.

6. Màn QStudy (UI/UX)

Tracker trên cùng: ẩn keyword mặc định (toggle “Show words”); icon trạng thái: 🟡 Pass1, 🟢🟢 Pass2, 🔴 Fail.

Trung tâm: câu hỏi (multi-line Column: Value) + vùng trả lời theo mode.

Speed Mode:

ON: hiển thị Correct/Incorrect + đáp án đúng, tự chuyển ~0.5–1s.

OFF: khi sai, mở Full Explanation (toàn bộ dòng).

Quit: modal theo quy tắc §5 (thoát giữa chừng).

7. FlashCards (không ghi điểm)

Chọn relation; nếu nhiều → random mỗi thẻ.

Lật thẻ: mặt trước = Question; mặt sau = Answer (Column: Value).

I Know → đưa về cuối; I Don’t Know → chèn ở y+2.

Không cập nhật bất kỳ thống kê nào.

8. Chỉ số & Công thức

Theo hàng
TotalAttempt = Passed1 + Passed2 + Failed
FailureRate = Failed / TotalAttempt (0 nếu TotalAttempt=0)
SuccessRate = 1 - FailureRate
RankPoint = (Passed1 + Passed2) - Failed
Level theo RankPoint: ≤0→L1, 1–3→L2, 4–7→L3, 8–15→L4, 16–31→L5, ≥32→L6
Theo dõi: LastPracticeDate, InQueue (+1 khi hoàn tất phiên), QuitQueue (cờ; reset false khi hoàn tất ở phiên sau).

Toàn cục
InQueueReal (số phiên hoàn tất), QuitQueueReal (số phiên bỏ dở).
XP: +10/từ hoàn tất, +50/phiên hoàn tất, −30/phiên bỏ dở.

PriorityScore (PS)

0.2*(1/(RankPoint+1))
+ 0.2*FailureRate
+ 0.1*(1/(Level+1))
+ 0.2*g(DaysSincePractice)
+ 0.2*h(QuitQueue)
+ 0.1*(1 - normalize(InQueue))


DaysSincePractice = Today - LastPracticeDate
g(x): <2d=0.1, <5d=0.5, <10d=0.8, ≥10d=1.0
h(QuitQueue): 1 nếu true, ngược lại 0
normalize(InQueue) = InQueue / max(InQueue trong bảng)

9. Study Filter vs Study Mode

Study Mode = cách hỏi (MCQ/TF/Typing) → quyết định relation hợp lệ.

Study Filter/Sort = chọn từ nào (PS/RankPoint/SuccessRate/…) với ≤3 lớp ưu tiên; có thể cho phép chọn tay sau lọc/sort.

10. Gamification

XP theo §8.

50 mốc Fibonacci (1 → 12,586,269,025), đặt tên; hiển thị Unlocked/Locked + Next milestone.

Penalty khi QuitQueueReal tăng: tùy chọn đóng băng/mất badge gần nhất (cấu hình).

Rewards tab: tổng XP, InQueueReal, QuitQueueReal, tiến độ mốc kế, badge gallery, history log (+/− XP, badge gain/loss).

11. Báo cáo (Stats)

Global KPIs: InQueueReal, QuitQueueReal, XP, trung bình SuccessRate.

Per-table: số từ, số Passed2, trung bình RankPoint, FailureRate, danh sách weak words (PS cao).

Biểu đồ: Attempts theo thời gian, Success vs Failure, tăng trưởng InQueue, danh sách QuitQueue=true.

12. Cài đặt & Sao lưu/Đồng bộ

Account: Offline/Online; Google OAuth; sync Supabase.

Auto backup (local): 30m / 2h / 6h / 1d / 2d / 7d (giữ 5 bản).

Manual: CSV/JSON.

Conflict resolution (Offline ↔ Online): Merge / Copy / Overwrite local / Overwrite cloud (mặc định trong Settings, có thể ghi đè khi thao tác).

Backup history: hiển thị 5 bản gần nhất.

13. Onboarding (Seed Demo)

3 bảng mẫu (6 cột nội dung + cột thống kê mặc định):

English C2 (15): Word*, Definition, Synonyms, Antonyms, Example Sentence, Note

English B1–B2 (15): Word*, Definition, Example, Part of Speech, Common Collocations, Note

Mandarin HSK1 (15): Word (Hanzi)*, Pinyin, Definition, Example Sentence, Example Translation, Note
(* = keyword/cột #1)

2 relation demo/bảng:
C2: (Word+Synonyms → Definition), (Word → Antonyms+Example)
B1–B2: (Word+POS → Definition+Example), (Collocations → Word)
HSK1: (Word+Pinyin → Definition+Example Sentence), (Example Translation → Word)

Seed 50 mốc Fibonacci (đặt tên).

14. Điều hướng & UI tổng thể

Bottom Nav: Home | Tables | Study | FlashCards | Stats | Rewards | Settings.

Home: quick stats (XP/InQueueReal/QuitQueueReal), preview 5 dòng gần nhất mỗi bảng, nút Study Now.

Tables: danh sách bảng; Toolbar: Toggle Columns, Filter, Multi-sort, Group, Bulk Tag, Import/Export.

Relations: danh sách + mode chips + Random toggle + Info/Preview.

Study Wizard: theo §4.

QStudy: tracker + Q/A + Speed Mode + Full Explanation + Quit modal.

FlashCards/Stats/Rewards/Settings như trên.

15. Toàn vẹn dữ liệu & Edge cases

Một từ không thể tăng InQueue hơn 1 lần trong cùng phiên (Pass2 loại khỏi queue).

Khi thoát: mục đã Pass2 giữ InQueue; mục chưa Pass2 → QuitQueue=true.

FlashCards không cập nhật thống kê.

Gợi ý nhập/merge: QuitQueue = OR, InQueue = SUM, LastPracticeDate = max.

16. Mô hình dữ liệu (ER — tóm tắt)

User 1–N VocabTable, StudySession, BackupRecord, RewardEvent; có globalState{InQueueReal,QuitQueueReal,XP}.

VocabTable 1–N VocabRow, Relation; lưu columns[] do người dùng định nghĩa (không gồm cột thống kê mặc định).

VocabRow thuộc VocabTable; keyword duy nhất; có cols{}, tags[], stats{...}.

Relation thuộc VocabTable; name, modes[], questionCols[], answerCols[] (các cột phải tồn tại; có thể cho phép keyword).

StudySession tham chiếu nhiều VocabTable; có nhiều SessionItem; trường: modes[], relationIds[]|RANDOM, filterLayers[], count, words[], speedMode, status, createdAt, endedAt; on commit cập nhật hàng + trạng thái toàn cục.

SessionItem: {rowId, relationId, mode, state: none|pass1|pass2|fail}; AttemptLog (tùy chọn) để audit.

Ràng buộc/chỉ mục: UNIQUE(tableId, keyword); index LastPracticeDate, InQueue, QuitQueue; (tùy chọn) UNIQUE Relation(tableId, name); index StudySession(userId, createdAt) và AttemptLog(sessionId, rowId, timestamp) nếu bật.

17. Rủi ro & Hạng mục mở

UX chọn từ: cân bằng giữa tự động (PS/filters) và chọn tay.

Tính nhất quán Offline/Online: định nghĩa rõ nguồn chân lý khi sync.

Hiệu năng: tối ưu query trên cột thống kê (đặc biệt DaysSincePractice).

Lạm dụng Quit: chính sách penalty/badge cần minh bạch, có log giải thích.

18. Tiêu chí chấp nhận (sample)

Có thể bắt đầu Study khi có ≥1 Relation; từ chưa có thống kê vẫn được đưa vào queue.

Phiên chỉ commit khi toàn bộ mục đạt Pass2; thoát giữa chừng ghi nhận QuitQueue=true đúng quy tắc.

PriorityScore hoạt động đúng công thức và bậc g(x) đã nêu.

Báo cáo hiển thị đủ KPI toàn cục và theo bảng; số liệu khớp với log.

dich ra tiếng Anh
Vmind1.5 — Design Analysis (Technical Markdown, no code)
0. Summary

Vmind1.5 is a vocabulary learning web app built around a Study Queue (mastery requires two consecutive correct answers), detailed stats, and gamification. It supports Offline (IndexedDB) and Online (Supabase via Google OAuth) modes and uses an incremental build approach (no overwrite; component detection via data-wf-id). The logic below mirrors the original spec, rewritten as product/UX design notes.

1. Goals & Non-functional

Goal: drive retention through a “two-in-a-row” queue mechanic, with progress tracking via stats/XP/badges.

Performance: lazy-load (preview first 5 rows per table); virtualized lists.

Data integrity: default columns are preserved; commit only when a session completes.

Operability: CSV import/export; auto/manual backup; conflict resolution across modes.

2. Table & Column Model

Users create multiple tables; user-defined content columns (add/remove).

Column #1 = keyword (PK, unique; validated on create/import).

Default columns (auto, non-deletable, pinned): Tags(multi), Passed1, Passed2, Failed, TotalAttempt, SuccessRate, FailureRate, RankPoint, Level, InQueue, QuitQueue, LastPracticeDate.

Presentation: Show/Hide toggles, multi-level Sort/Filter/Group, Bulk Tag.

Per-row stats reset to relearn a word.

CSV: schema must match current column count; key conflict options: Merge / Overwrite / Add-new-only / View-only.

3. Relation (Q–A Mapping)

Required before Study (warn/guide if missing).

Config: QuestionCols(1..n), AnswerCols(1..n); modes MCQ / TF / Typing.

Naming: UserLabel (MCQ,TF,Typing).

Q/A format: each line ColumnName: Value.

Info button: config + preview.

Random Relation: when multiple are selected, randomize per question and guarantee each chosen relation appears at least once per queue.

Make Relations toggle lists all relations for the current table.

4. Study Flow (5-Step Wizard)

Select 1..n tables (prompt create if none).

Select mode(s) (MCQ/TF/Typing). If ≥2 → allow randomize.

Select relation(s) or enable Random Relation (disables list).

Choose word-selection strategy (≤3 priority layers):
PriorityScore, lowest RankPoint, lowest SuccessRate, longest DaysSincePractice, prioritize QuitQueue=true, low InQueue.
Optionally allow Manual Choose after filter/sort.

Choose word count: 5 / 7 / 10 / 15 (min 5). Multi-table selection allowed; warn if insufficient.

Preview list (toggle) with Remove / Add / Shuffle.

Supporting UX: compact table toggle; users may filter/sort then pick manually, or quick-pick via 5/7/10/15 buttons.

Start session.

5. Study Queue (Core)

Queue size: 5/7/10/15.

Wrong → move item to position y+2; temp Fail.

First correct → temp Pass1; move to tail.

Second correct → Pass2; remove from queue.

No “Submit”; session ends when all items reach Pass2.

Commit on completion:

Per-row: update Passed1/Passed2/Failed/TotalAttempt/RankPoint/SuccessRate/FailureRate/Level, increment InQueue, set LastPracticeDate.

Global: increment InQueueReal.

Quit mid-session: no commit of Pass/Fail/RankPoint; set QuitQueue=true for items not yet Pass2; increment QuitQueueReal; warn on tab close/navigation.

6. QStudy Screen (UX)

Top tracker: keywords hidden by default (toggle “Show words”); state icons: 🟡 Pass1, 🟢🟢 Pass2, 🔴 Fail.

Center: Question (multi-line Column: Value) + answer UI by mode.

Speed Mode:

ON: show Correct/Incorrect + correct answer, auto-next ~0.5–1s.

OFF: on wrong → Full Explanation (full row).

Quit modal per §5 rules.

7. FlashCards (No scoring)

Pick relations; if multiple → random per card.

Flip: front = Question; back = Answer (Column: Value).

I Know → send to tail. I Don’t Know → insert at y+2.

Stats are not updated.

8. Metrics & Formulas

Per-row
TotalAttempt = Passed1 + Passed2 + Failed
FailureRate = Failed / TotalAttempt (0 if TotalAttempt=0)
SuccessRate = 1 - FailureRate
RankPoint = (Passed1 + Passed2) - Failed
Level by RankPoint: ≤0→L1, 1–3→L2, 4–7→L3, 8–15→L4, 16–31→L5, ≥32→L6
Track: LastPracticeDate, InQueue (+1 when finished in a completed session), QuitQueue (flag; reset false after a later finished session).

Global
InQueueReal (completed sessions), QuitQueueReal (abandoned sessions).
XP: +10 per word completed; +50 per session completed; −30 per session abandoned.

PriorityScore (PS)

0.2*(1/(RankPoint+1))
+ 0.2*FailureRate
+ 0.1*(1/(Level+1))
+ 0.2*g(DaysSincePractice)
+ 0.2*h(QuitQueue)
+ 0.1*(1 - normalize(InQueue))


DaysSincePractice = Today - LastPracticeDate
g(x): <2d=0.1, <5d=0.5, <10d=0.8, ≥10d=1.0
h(QuitQueue): 1 if true, else 0
normalize(InQueue) = InQueue / max(InQueue within table)

9. Study Filter vs Study Mode

Study Mode = how to ask (MCQ/TF/Typing) → defines eligible relations.

Study Filter/Sort = which words to pick (PS/RankPoint/SuccessRate/…) with ≤3 layers; optional manual pick after filtering/sorting.

10. Gamification

XP as in §8.

50 Fibonacci milestones (1 → 12,586,269,025), named; show Unlocked/Locked and Next milestone.

Penalty when QuitQueueReal increases: optionally freeze/lose the latest badge (configurable).

Rewards tab: XP, InQueueReal, QuitQueueReal, progress to next milestone, badge gallery, and history log (+/− XP, badge gain/loss).

11. Reporting

Global KPIs: InQueueReal, QuitQueueReal, XP, average SuccessRate.

Per-table KPIs: word count, Passed2 count, avg RankPoint, avg FailureRate, weak words list (highest PS).

Charts: Attempts over time, Success vs Failure, InQueue growth, list of of QuitQueue=true words.

12. Settings & Backup/Sync

Account: Offline/Online; Google OAuth; Supabase sync.

Auto backup (local): 30m / 2h / 6h / 1d / 2d / 7d (keep 5).

Manual: CSV/JSON.

Conflict resolution (Offline ↔ Online): Merge / Copy / Overwrite local / Overwrite cloud (default in Settings, overridable).

Backup history: show last 5.

13. Onboarding (Seed Demo)

3 sample tables (6 content cols + default stats):

English C2 (15): Word*, Definition, Synonyms, Antonyms, Example Sentence, Note

English B1–B2 (15): Word*, Definition, Example, Part of Speech, Common Collocations, Note

Mandarin HSK1 (15): Word (Hanzi)*, Pinyin, Definition, Example Sentence, Example Translation, Note
(* = keyword / column #1)

Two demo relations per table as in the original spec.

Seed 50 Fibonacci milestones (named).

14. Navigation & Overall UI

Bottom Nav: Home | Tables | Study | FlashCards | Stats | Rewards | Settings.

Home: quick stats (XP/InQueueReal/QuitQueueReal), 5-row previews, Study Now.

Tables: list + toolbar (Toggle Columns, Filter, Multi-sort, Group, Bulk Tag, Import/Export).

Relations: list, mode chips, Random toggle, Info/Preview.

Study Wizard: as §4.

QStudy: tracker + Q/A + Speed Mode + Full Explanation + Quit modal.

FlashCards / Stats / Rewards / Settings as defined.

15. Data Integrity & Edge Cases

A word cannot gain InQueue more than once within the same session (Pass2 removes it).

On quit: items already Pass2 keep InQueue; others receive QuitQueue=true.

FlashCards never update stats.

Import/merge suggestion: QuitQueue = OR, InQueue = SUM, LastPracticeDate = max.

16. Data Model (ER — summary)

User 1–N VocabTable, StudySession, BackupRecord, RewardEvent; stores globalState{InQueueReal, QuitQueueReal, XP}.

VocabTable 1–N VocabRow, Relation; keeps user-defined columns[] (excludes default stats).

VocabRow belongs to VocabTable; unique keyword; cols{}, tags[], stats{...}.

Relation belongs to VocabTable; fields name, modes[], questionCols[], answerCols[] (columns must exist; may allow keyword).

StudySession references many tables; has many SessionItem; fields: modes[], relationIds[]|RANDOM, filterLayers[], count, words[], speedMode, status, createdAt, endedAt; on commit updates rows + global state.

SessionItem: {rowId, relationId, mode, state: none|pass1|pass2|fail}; optional AttemptLog for auditing.

Constraints/Indexing: UNIQUE(tableId, keyword); index LastPracticeDate, InQueue, QuitQueue; optional UNIQUE Relation(tableId, name); index StudySession(userId, createdAt) and AttemptLog(sessionId, rowId, timestamp) if enabled.

17. Risks & Open Items

Word selection UX: balance automation (PS/filters) with manual pick.

Consistency across Offline/Online: define a clear source of truth for sync.

Performance: optimize queries on stats columns (esp. DaysSincePractice).

Quit behavior: clarify badge/penalty policy with transparent event logs.

18. Acceptance Examples

Study can start when ≥1 Relation exists; words without prior stats are eligible.

Session commits only when all items reach Pass2; quitting marks QuitQueue=true according to rules.

PriorityScore computes per formula and bucketing in §8.

Reports show all global/per-table KPIs; numbers reconcile with logs.
