import { VocabTable, VocabRow, Relation, StudyMode, GlobalStats, VocabRowStats, StudyConfig, StudySession, WordProgress, ColumnDef, VmindSettings, RewardEvent, BackupRecord } from '../types';
import { FIBONACCI_MILESTONES } from '../constants';

const USER_DATA_KEY = 'vmind-user-data';
let isSampleMode = false;

// --- In-memory database simulation ---
let mockTables: VocabTable[];
let mockRelations: Relation[];
let mockGlobalStats: GlobalStats;
let mockStudySessions: StudySession[];
let mockSettings: VmindSettings;
let mockRewardEvents: RewardEvent[];
let mockBackupRecords: BackupRecord[];

const persistState = () => {
    if (isSampleMode) return;
    try {
        const { theme, ...persistableSettings } = mockSettings;
        const state = {
            tables: mockTables,
            relations: mockRelations,
            globalStats: mockGlobalStats,
            studySessions: mockStudySessions,
            settings: persistableSettings,
            rewardEvents: mockRewardEvents,
            backupRecords: mockBackupRecords
        };
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save user data", e);
    }
};

const defaultSettings: VmindSettings = {
    theme: 'light',
    quitPenaltyEnabled: true,
    autoBackup: {
        enabled: true,
        interval: '6h',
        keep: 5,
    },
    conflictPolicy: 'merge',
};

const loadState = () => {
    try {
        const storedState = localStorage.getItem(USER_DATA_KEY);
        if (storedState) {
            const state = JSON.parse(storedState);
            mockTables = state.tables || [];
            mockRelations = state.relations || [];
            mockGlobalStats = state.globalStats || { xp: 0, inQueueReal: 0, quitQueueReal: 0 };
            mockStudySessions = state.studySessions || [];
            mockSettings = { ...defaultSettings, ...(state.settings || {}) };
            mockRewardEvents = state.rewardEvents || [];
            mockBackupRecords = state.backupRecords || [];
        } else {
            // New user, initialize with empty state
            mockTables = [];
            mockRelations = [];
            mockGlobalStats = { xp: 0, inQueueReal: 0, quitQueueReal: 0 };
            mockStudySessions = [];
            mockSettings = defaultSettings;
            mockRewardEvents = [];
            mockBackupRecords = [];
        }
    } catch (e) {
        console.error("Failed to load user data", e);
        // Initialize with empty state on error
        mockTables = [];
        mockRelations = [];
        mockGlobalStats = { xp: 0, inQueueReal: 0, quitQueueReal: 0 };
        mockStudySessions = [];
        mockSettings = defaultSettings;
        mockRewardEvents = [];
        mockBackupRecords = [];
    }
};

const recalculateStats = (stats: Partial<VocabRowStats>): VocabRowStats => {
    const passed1 = stats.Passed1 || 0;
    const passed2 = stats.Passed2 || 0;
    const failed = stats.Failed || 0;

    const totalAttempt = passed1 + passed2 + failed;
    const failureRate = totalAttempt === 0 ? 0 : failed / totalAttempt;
    const successRate = 1 - failureRate;
    const rankPoint = (passed1 + passed2) - failed;

    let level = 1;
    if (rankPoint >= 32) level = 6;
    else if (rankPoint >= 16) level = 5;
    else if (rankPoint >= 8) level = 4;
    else if (rankPoint >= 4) level = 3;
    else if (rankPoint >= 1) level = 2;

    return {
        Passed1: passed1,
        Passed2: passed2,
        Failed: failed,
        TotalAttempt: totalAttempt,
        SuccessRate: successRate,
        FailureRate: failureRate,
        RankPoint: rankPoint,
        Level: level,
        InQueue: stats.InQueue || 0,
        QuitQueue: stats.QuitQueue || false,
        LastPracticeDate: stats.LastPracticeDate || null,
        flashcardStatus: stats.flashcardStatus || 'None',
    };
};


const createNewRow = (tableId: string, keyword: string, data: Record<string, string>): VocabRow => {
    return {
        id: `${tableId}-${Date.now()}-${Math.random()}`, // Ensure unique ID even if keyword changes
        tableId,
        keyword,
        data,
        tags: [],
        stats: recalculateStats({
            Passed1: 0,
            Passed2: 0,
            Failed: 0,
            InQueue: 0,
            QuitQueue: false,
            LastPracticeDate: null,
            flashcardStatus: 'None',
        })
    };
};

const initializeData = () => {
    const createRowWithRandomStats = (tableId: string, keyword: string, data: Record<string, string>): VocabRow => {
        const stats = recalculateStats({
            Passed1: Math.floor(Math.random() * 10),
            Passed2: Math.floor(Math.random() * 20),
            Failed: Math.floor(Math.random() * 5),
            InQueue: Math.floor(Math.random() * 5),
            QuitQueue: Math.random() > 0.8,
            LastPracticeDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            flashcardStatus: 'None',
        });

        return {
            id: `${tableId}-${keyword}`,
            tableId,
            keyword,
            data,
            tags: [],
            stats: stats,
        };
    };

    const c2Rows = [
        createRowWithRandomStats('eng-c2', 'Ubiquitous', { 'Definition': 'Present, appearing, or found everywhere.', 'Synonyms': 'Omnipresent, Pervasive', 'Antonyms': 'Rare, Scarce', 'Example Sentence': 'His ubiquitous influence was felt by all the family.', 'Visual Cue': 'https://source.unsplash.com/random/150x150?everywhere' }),
        createRowWithRandomStats('eng-c2', 'Ephemeral', { 'Definition': 'Lasting for a very short time.', 'Synonyms': 'Transitory, Fleeting', 'Antonyms': 'Permanent, Enduring', 'Example Sentence': 'The beauty of the cherry blossom is ephemeral.', 'Visual Cue': 'https://source.unsplash.com/random/150x150?cherry-blossom' }),
        createRowWithRandomStats('eng-c2', 'Pulchritudinous', { 'Definition': 'Having great physical beauty.', 'Synonyms': 'Beautiful, Gorgeous', 'Antonyms': 'Ugly, Hideous', 'Example Sentence': 'She was a pulchritudinous young woman.', 'Visual Cue': 'https://source.unsplash.com/random/150x150?beauty' }),
        createRowWithRandomStats('eng-c2', 'Mellifluous', { 'Definition': 'A sound that is sweet and smooth, pleasing to hear.', 'Synonyms': 'Euphonious, Dulcet', 'Antonyms': 'Cacophonous, Harsh', 'Example Sentence': 'Her mellifluous voice enchanted the audience.', 'Visual Cue': 'https://source.unsplash.com/random/150x150?sound-wave' }),
        createRowWithRandomStats('eng-c2', 'Perspicacious', { 'Definition': 'Having a ready insight into and understanding of things.', 'Synonyms': 'Astute, Shrewd', 'Antonyms': 'Dull, Obtuse', 'Example Sentence': 'The perspicacious detective solved the case with ease.', 'Visual Cue': '' }),
        createRowWithRandomStats('eng-c2', 'Serendipity', { 'Definition': 'The occurrence of events by chance in a happy or beneficial way.', 'Synonyms': 'Fluke, Providence', 'Antonyms': 'Mishap, Misfortune', 'Example Sentence': 'Finding a rare book in a dusty corner was a moment of serendipity.', 'Visual Cue': '' }),
        createRowWithRandomStats('eng-c2', 'Anachronism', { 'Definition': 'A thing belonging to a period other than that in which it exists.', 'Synonyms': 'Misplacement, Solecism', 'Antonyms': 'Timeliness', 'Example Sentence': 'A knight using a smartphone would be an anachronism.', 'Visual Cue': '' }),
        createRowWithRandomStats('eng-c2', 'Equanimity', { 'Definition': 'Mental calmness, composure, and evenness of temper, especially in a difficult situation.', 'Synonyms': 'Composure, Sangfroid', 'Antonyms': 'Anxiety, Agitation', 'Example Sentence': 'He faced the crisis with equanimity.', 'Visual Cue': '' }),
        createRowWithRandomStats('eng-c2', 'Idiosyncrasy', { 'Definition': 'A mode of behavior or way of thought peculiar to an individual.', 'Synonyms': 'Peculiarity, Quirk', 'Antonyms': 'Normality, Conformity', 'Example Sentence': 'Her habit of talking to plants was a charming idiosyncrasy.', 'Visual Cue': '' }),
        createRowWithRandomStats('eng-c2', 'Laconic', { 'Definition': 'Using very few words.', 'Synonyms': 'Brief, Terse', 'Antonyms': 'Verbose, Loquacious', 'Example Sentence': 'His laconic reply suggested a lack of interest.', 'Visual Cue': '' }),
        createRowWithRandomStats('eng-c2', 'Proclivity', { 'Definition': 'A tendency to choose or do something regularly.', 'Synonyms': 'Penchant, Predisposition', 'Antonyms': 'Aversion, Disinclination', 'Example Sentence': 'He has a proclivity for making friends easily.', 'Visual Cue': '' }),
        createRowWithRandomStats('eng-c2', 'Sycophant', { 'Definition': 'A person who acts obsequiously toward someone important in order to gain advantage.', 'Synonyms': 'Flatterer, Toady', 'Antonyms': 'Rebel, Leader', 'Example Sentence': 'The king was surrounded by sycophants who praised his every word.', 'Visual Cue': '' }),
        createRowWithRandomStats('eng-c2', 'Vicissitude', { 'Definition': 'A change of circumstances or fortune, typically one that is unwelcome or unpleasant.', 'Synonyms': 'Fluctuation, Upheaval', 'Antonyms': 'Stability, Constancy', 'Example Sentence': 'The vicissitudes of life taught him resilience.', 'Visual Cue': '' }),
        createRowWithRandomStats('eng-c2', 'Zephyr', { 'Definition': 'A soft gentle breeze.', 'Synonyms': 'Breeze, Gust', 'Antonyms': 'Gale, Tempest', 'Example Sentence': 'A cool zephyr rustled the leaves in the trees.', 'Visual Cue': '' }),
        createRowWithRandomStats('eng-c2', 'Quixotic', { 'Definition': 'Exceedingly idealistic; unrealistic and impractical.', 'Synonyms': 'Idealistic, Visionary', 'Antonyms': 'Practical, Realistic', 'Example Sentence': 'His quixotic quest to end world hunger was admirable but ultimately futile.', 'Visual Cue': '' }),
    ];

    const b1b2Rows = [
        createRowWithRandomStats('eng-b1b2', 'Accommodate', { 'Definition': 'To provide lodging or sufficient space for.', 'Example': 'The hotel can accommodate up to 500 guests.', 'Part of Speech': 'Verb', 'Common Collocations': 'accommodate needs, accommodate guests', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Conscious', { 'Definition': 'Aware of and responding to one\'s surroundings.', 'Example': 'He was conscious of the fact that he was being watched.', 'Part of Speech': 'Adjective', 'Common Collocations': 'conscious decision, environmentally conscious', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Perceive', { 'Definition': 'To become aware or conscious of (something); come to realize or understand.', 'Example': 'I perceived a change in his behaviour.', 'Part of Speech': 'Verb', 'Common Collocations': 'perceive a threat, perceive as', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Ambiguous', { 'Definition': 'Open to more than one interpretation; having a double meaning.', 'Example': 'The instructions were ambiguous.', 'Part of Speech': 'Adjective', 'Common Collocations': 'ambiguous statement, ambiguous results', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Collaborate', { 'Definition': 'Work jointly on an activity, especially to produce or create something.', 'Example': 'The two artists decided to collaborate on a new sculpture.', 'Part of Speech': 'Verb', 'Common Collocations': 'collaborate with, collaborate on', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Persistent', { 'Definition': 'Continuing firmly or obstinately in a course of action in spite of difficulty or opposition.', 'Example': 'Her persistent efforts finally paid off.', 'Part of Speech': 'Adjective', 'Common Collocations': 'persistent cough, persistent rumors', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Sufficient', { 'Definition': 'Enough; adequate.', 'Example': 'There was sufficient food for everyone.', 'Part of Speech': 'Adjective', 'Common Collocations': 'sufficient evidence, sufficient time', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Validate', { 'Definition': 'Check or prove the validity or accuracy of (something).', 'Example': 'You need to validate your parking ticket.', 'Part of Speech': 'Verb', 'Common Collocations': 'validate a theory, validate feelings', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Diverse', { 'Definition': 'Showing a great deal of variety; very different.', 'Example': 'The city has a diverse population.', 'Part of Speech': 'Adjective', 'Common Collocations': 'diverse background, diverse range', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Inevitable', { 'Definition': 'Certain to happen; unavoidable.', 'Example': 'Change is an inevitable part of life.', 'Part of Speech': 'Adjective', 'Common Collocations': 'inevitable consequence, inevitable conclusion', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Negotiate', { 'Definition': 'Obtain or bring about by discussion.', 'Example': 'They managed to negotiate a peace treaty.', 'Part of Speech': 'Verb', 'Common Collocations': 'negotiate a deal, negotiate with', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Reluctant', { 'Definition': 'Unwilling and hesitant; disinclined.', 'Example': 'He was reluctant to leave.', 'Part of Speech': 'Adjective', 'Common Collocations': 'reluctant to admit, reluctant hero', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Vulnerable', { 'Definition': 'Exposed to the possibility of being attacked or harmed, either physically or emotionally.', 'Example': 'The young birds are vulnerable to predators.', 'Part of Speech': 'Adjective', 'Common Collocations': 'vulnerable to attack, emotionally vulnerable', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Subtle', { 'Definition': 'So delicate or precise as to be difficult to analyze or describe.', 'Example': 'There was a subtle change in his expression.', 'Part of Speech': 'Adjective', 'Common Collocations': 'subtle difference, subtle hint', 'Note': '' }),
        createRowWithRandomStats('eng-b1b2', 'Emphasis', { 'Definition': 'Special importance, value, or prominence given to something.', 'Example': 'The course places emphasis on practical skills.', 'Part of Speech': 'Noun', 'Common Collocations': 'place emphasis on, main emphasis', 'Note': '' }),
    ];

    const hsk1Rows = [
        createRowWithRandomStats('hsk1', '你好', { 'Pinyin': 'nǐ hǎo', 'Definition': 'Hello', 'Example Sentence': '你好吗？', 'Example Translation': 'How are you?', 'Note': '' }),
        createRowWithRandomStats('hsk1', '谢谢', { 'Pinyin': 'xièxie', 'Definition': 'Thank you', 'Example Sentence': '谢谢你的帮助。', 'Example Translation': 'Thank you for your help.', 'Note': '' }),
        createRowWithRandomStats('hsk1', '不客气', { 'Pinyin': 'bú kèqi', 'Definition': 'You\'re welcome', 'Example Sentence': 'A: 谢谢! B: 不客气。', 'Example Translation': 'A: Thanks! B: You\'re welcome.', 'Note': '' }),
        createRowWithRandomStats('hsk1', '我', { 'Pinyin': 'wǒ', 'Definition': 'I, me', 'Example Sentence': '我是学生。', 'Example Translation': 'I am a student.', 'Note': '' }),
        createRowWithRandomStats('hsk1', '爱', { 'Pinyin': 'ài', 'Definition': 'Love', 'Example Sentence': '我爱你。', 'Example Translation': 'I love you.', 'Note': '' }),
        createRowWithRandomStats('hsk1', '是', { 'Pinyin': 'shì', 'Definition': 'To be (am, is, are)', 'Example Sentence': '他是一名医生。', 'Example Translation': 'He is a doctor.', 'Note': '' }),
        createRowWithRandomStats('hsk1', '家', { 'Pinyin': 'jiā', 'Definition': 'Family, home', 'Example Sentence': '我家有四口人。', 'Example Translation': 'There are four people in my family.', 'Note': '' }),
        createRowWithRandomStats('hsk1', '吃', { 'Pinyin': 'chī', 'Definition': 'To eat', 'Example Sentence': '你喜欢吃什么？', 'Example Translation': 'What do you like to eat?', 'Note': '' }),
        createRowWithRandomStats('hsk1', '看', { 'Pinyin': 'kàn', 'Definition': 'To see, to look, to watch', 'Example Sentence': '我喜欢看电影。', 'Example Translation': 'I like to watch movies.', 'Note': '' }),
        createRowWithRandomStats('hsk1', '朋友', { 'Pinyin': 'péngyou', 'Definition': 'Friend', 'Example Sentence': '他是我最好的朋友。', 'Example Translation': 'He is my best friend.', 'Note': '' }),
        createRowWithRandomStats('hsk1', '学校', { 'Pinyin': 'xuéxiào', 'Definition': 'School', 'Example Sentence': '这个学校很大。', 'Example Translation': 'This school is very big.', 'Note': '' }),
        createRowWithRandomStats('hsk1', '明天', { 'Pinyin': 'míngtiān', 'Definition': 'Tomorrow', 'Example Sentence': '我们明天见。', 'Example Translation': 'See you tomorrow.', 'Note': '' }),
        createRowWithRandomStats('hsk1', '中国', { 'Pinyin': 'Zhōngguó', 'Definition': 'China', 'Example Sentence': '我来自中国。', 'Example Translation': 'I am from China.', 'Note': '' }),
        createRowWithRandomStats('hsk1', '说', { 'Pinyin': 'shuō', 'Definition': 'To speak, to say', 'Example Sentence': '你会说汉语吗？', 'Example Translation': 'Can you speak Chinese?', 'Note': '' }),
        createRowWithRandomStats('hsk1', '再见', { 'Pinyin': 'zàijiàn', 'Definition': 'Goodbye', 'Example Sentence': '老师，再见！', 'Example Translation': 'Goodbye, teacher!', 'Note': '' }),
    ];

    mockTables = [
        { id: 'eng-c2', name: 'English C2', columns: [
            { name: 'Definition', type: 'text' },
            { name: 'Synonyms', type: 'text' },
            { name: 'Antonyms', type: 'text' },
            { name: 'Example Sentence', type: 'text' },
            { name: 'Visual Cue', type: 'image' },
        ], rows: c2Rows },
        { id: 'eng-b1b2', name: 'English B1-B2', columns: [
            { name: 'Definition', type: 'text' },
            { name: 'Example', type: 'text' },
            { name: 'Part of Speech', type: 'text' },
            { name: 'Common Collocations', type: 'text' },
            { name: 'Note', type: 'text' },
        ], rows: b1b2Rows },
        { id: 'hsk1', name: 'Mandarin HSK1', columns: [
            { name: 'Pinyin', type: 'text' },
            { name: 'Definition', type: 'text' },
            { name: 'Example Sentence', type: 'text' },
            { name: 'Example Translation', type: 'text' },
            { name: 'Note', type: 'text' },
        ], rows: hsk1Rows },
    ];

    mockRelations = [
        { id: 'rel1', tableId: 'eng-c2', name: 'Word+Synonyms -> Definition', modes: [StudyMode.MCQ, StudyMode.Typing], questionCols: ['keyword', 'Synonyms'], answerCols: ['Definition'] },
        { id: 'rel2', tableId: 'eng-c2', name: 'Word -> Antonyms+Example', modes: [StudyMode.MCQ], questionCols: ['keyword'], answerCols: ['Antonyms', 'Example Sentence'] },
        { id: 'rel3', tableId: 'eng-b1b2', name: 'Word+POS -> Definition+Example', modes: [StudyMode.MCQ, StudyMode.Typing], questionCols: ['keyword', 'Part of Speech'], answerCols: ['Definition', 'Example'] },
        { id: 'rel4', tableId: 'eng-b1b2', name: 'Collocations -> Word', modes: [StudyMode.MCQ], questionCols: ['Common Collocations'], answerCols: ['keyword'] },
        { id: 'rel5', tableId: 'hsk1', name: 'Word+Pinyin -> Definition', modes: [StudyMode.MCQ, StudyMode.Typing], questionCols: ['keyword', 'Pinyin'], answerCols: ['Definition'] },
        { id: 'rel6', tableId: 'hsk1', name: 'Translation -> Word', modes: [StudyMode.MCQ], questionCols: ['Example Translation'], answerCols: ['keyword'] },
    ];

    mockGlobalStats = {
        xp: 1337,
        inQueueReal: 42,
        quitQueueReal: 5,
    };

    mockStudySessions = [
        {
            id: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'completed',
            tableIds: ['eng-c2'],
            tableNames: ['English C2'],
            modes: [StudyMode.MCQ],
            wordCount: 10,
        },
        {
            id: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'quit',
            tableIds: ['eng-b1b2', 'hsk1'],
            tableNames: ['English B1-B2', 'Mandarin HSK1'],
            modes: [StudyMode.Typing, StudyMode.MCQ],
            wordCount: 15,
        }
    ];

    mockSettings = {
        theme: 'dark',
        quitPenaltyEnabled: true,
        autoBackup: {
            enabled: true,
            interval: '6h',
            keep: 5,
        },
        conflictPolicy: 'merge',
    };

    mockRewardEvents = [
        { id: 'evt3', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: 'session_quit', description: 'Quit session with English B1-B2, Mandarin HSK1', xpChange: -30 },
        { id: 'evt2', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), type: 'milestone_unlocked', description: 'Unlocked "Celestial" badge!', xpChange: 0 },
        { id: 'evt1', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), type: 'session_complete', description: 'Completed English C2 session', xpChange: 120 },
    ];

    mockBackupRecords = [
        { id: 'bak5', timestamp: new Date(Date.now() - 1 * 6 * 60 * 60 * 1000).toISOString(), type: 'auto', format: 'json', fileRef: 'backup_auto_1.json' },
        { id: 'bak4', timestamp: new Date(Date.now() - 2 * 6 * 60 * 60 * 1000).toISOString(), type: 'auto', format: 'json', fileRef: 'backup_auto_2.json' },
        { id: 'bak3', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), type: 'manual', format: 'csv', fileRef: 'backup_manual_1.csv' },
        { id: 'bak2', timestamp: new Date(Date.now() - 3 * 6 * 60 * 60 * 1000).toISOString(), type: 'auto', format: 'json', fileRef: 'backup_auto_3.json' },
        { id: 'bak1', timestamp: new Date(Date.now() - 4 * 6 * 60 * 60 * 1000).toISOString(), type: 'auto', format: 'json', fileRef: 'backup_auto_4.json' },
    ];
};

const setSampleMode = async (active: boolean) => {
    isSampleMode = active;
    if (active) {
        initializeData();
    } else {
        loadState();
    }
};

type ConflictResolutionStrategy = 'merge' | 'overwrite' | 'addNewOnly';

const calculatePriorityScore = (row: VocabRow, maxInQueueInTable: number): number => {
    const { RankPoint, FailureRate, Level, InQueue, QuitQueue, LastPracticeDate } = row.stats;
    
    // Days since practice
    const today = new Date();
    const lastPractice = LastPracticeDate ? new Date(LastPracticeDate) : new Date(0);
    const daysSincePractice = (today.getTime() - lastPractice.getTime()) / (1000 * 3600 * 24);

    // g(x) function for days since practice
    let g_x = 0.1;
    if (daysSincePractice >= 10) g_x = 1.0;
    else if (daysSincePractice >= 5) g_x = 0.8;
    else if (daysSincePractice >= 2) g_x = 0.5;

    // h(QuitQueue) function
    const h_QuitQueue = QuitQueue ? 1 : 0;
    
    // Normalize InQueue
    const normalizedInQueue = maxInQueueInTable > 0 ? InQueue / maxInQueueInTable : 0;
    
    // The formula is 1/(RankPoint+1). This is problematic if RankPoint is -1 (division by zero)
    // or less than -1 (denominator becomes negative, breaking the logic that lower rank points
    // should increase the score).
    // We handle this by clamping the RankPoint at a value just above -1 to ensure the denominator
    // is always a small positive number for low RankPoints, correctly creating a large score component.
    const rankPointComponent = 1 / (Math.max(RankPoint, -0.999) + 1);

    const ps =
        0.2 * rankPointComponent +
        0.2 * FailureRate +
        0.1 * (1 / (Level + 1)) +
        0.2 * g_x +
        0.2 * h_QuitQueue +
        0.1 * (1 - normalizedInQueue);

    return ps;
};

export const dataService = {
  setSampleMode,
  getTables: async (): Promise<VocabTable[]> => {
    await new Promise(res => setTimeout(res, 100));
    return mockTables;
  },
  getRelationsForTable: async (tableId: string): Promise<Relation[]> => {
    await new Promise(res => setTimeout(res, 100));
    return mockRelations.filter(r => r.tableId === tableId);
  },
  getRelationsForTables: async (tableIds: string[]): Promise<Relation[]> => {
    await new Promise(res => setTimeout(res, 100));
    return mockRelations.filter(r => tableIds.includes(r.tableId));
  },
  getGlobalStats: async (): Promise<GlobalStats> => {
    await new Promise(res => setTimeout(res, 100));
    return mockGlobalStats;
  },
  getStudySessions: async (): Promise<StudySession[]> => {
    await new Promise(res => setTimeout(res, 100));
    return [...mockStudySessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getSettings: async (): Promise<VmindSettings> => {
    await new Promise(res => setTimeout(res, 50));
    return mockSettings;
  },
  updateSettings: async (newSettings: Partial<VmindSettings>): Promise<VmindSettings> => {
    await new Promise(res => setTimeout(res, 50));
    mockSettings = { ...mockSettings, ...newSettings };
    persistState();
    return mockSettings;
  },
  getRewardEvents: async (): Promise<RewardEvent[]> => {
    await new Promise(res => setTimeout(res, 100));
    return [...mockRewardEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  getBackupHistory: async (): Promise<BackupRecord[]> => {
    await new Promise(res => setTimeout(res, 100));
    return [...mockBackupRecords].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  triggerManualBackup: async (format: 'json' | 'csv'): Promise<void> => {
    await new Promise(res => setTimeout(res, 100)); // Shortened wait time as download is separate
    const newBackup: BackupRecord = {
        id: `bak-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'manual',
        format,
        fileRef: `backup_manual_${Date.now()}.${format}`
    };
    mockBackupRecords.unshift(newBackup);
    // Keep only the last 5
    mockBackupRecords = mockBackupRecords
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
    persistState();
  },
  getAllDataForBackup: async (): Promise<object> => {
    await new Promise(res => setTimeout(res, 100));
    return {
      tables: mockTables,
      relations: mockRelations,
      globalStats: mockGlobalStats,
      studySessions: mockStudySessions,
      settings: mockSettings,
      rewardEvents: mockRewardEvents,
    };
  },
  saveStudySession: async function(sessionData: Omit<StudySession, 'id' | 'createdAt'>): Promise<void> {
    await new Promise(res => setTimeout(res, 50));
    const newSession: StudySession = {
        ...sessionData,
        id: new Date().toISOString() + Math.random(),
        createdAt: new Date().toISOString(),
    };
    mockStudySessions.push(newSession);
    persistState();
  },
  updateStatsOnCompletion: async function(config: StudyConfig, sessionProgress: Record<string, WordProgress>): Promise<void> {
    await new Promise(res => setTimeout(res, 200));
    
    let wordsMastered = 0;

    config.words.forEach(word => {
        const progress = sessionProgress[word.id];
        if (!progress) return;

        const table = mockTables.find(t => t.id === word.tableId);
        const row = table?.rows.find(r => r.id === word.id);
        if (!row) return;
        
        const currentStats = { ...row.stats };

        // A word is "mastered" if it reached pass2 state in the session.
        if(progress.status === 'pass2') {
            wordsMastered++;
            currentStats.Passed2 += 1;
            currentStats.InQueue += 1;
            currentStats.QuitQueue = false; // Reset quit flag on completion
        } else if (progress.status === 'pass1') {
            currentStats.Passed1 += 1;
        }
        
        currentStats.Failed += progress.newFails;
        currentStats.LastPracticeDate = new Date().toISOString();

        row.stats = recalculateStats(currentStats);
    });
    
    const tableNames = mockTables.filter(t => config.tableIds.includes(t.id)).map(t => t.name);
    
    // --- Gamification Update ---
    const oldXp = mockGlobalStats.xp;
    const xpGained = 50 + (wordsMastered * 10);
    mockGlobalStats.xp += xpGained;
    const newXp = mockGlobalStats.xp;

    mockRewardEvents.push({
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'session_complete',
        description: `Completed session with ${tableNames.join(', ')}`,
        xpChange: xpGained,
    });

    FIBONACCI_MILESTONES.forEach(milestone => {
        if (oldXp < milestone.xp && newXp >= milestone.xp) {
            mockRewardEvents.push({
                id: `evt-${Date.now()}-${milestone.name}`,
                timestamp: new Date().toISOString(),
                type: 'milestone_unlocked',
                description: `Unlocked "${milestone.name}" badge!`,
                xpChange: 0,
            });
        }
    });

    mockGlobalStats.inQueueReal += 1;
    
    await this.saveStudySession({
        status: 'completed',
        tableIds: config.tableIds,
        tableNames,
        modes: config.modes,
        wordCount: config.words.length,
    });
    persistState();
  },

  updateStatsOnQuit: async function(config: StudyConfig, wordProgress: Record<string, WordProgress>): Promise<void> {
    await new Promise(res => setTimeout(res, 200));
    
    config.words.forEach(word => {
        const progress = wordProgress[word.id];
        // Any word not fully mastered (pass2) gets the quit flag
        if (progress && progress.status !== 'pass2') {
            const table = mockTables.find(t => t.id === word.tableId);
            const row = table?.rows.find(r => r.id === word.id);
            if (row) {
                row.stats.QuitQueue = true;
            }
        }
    });
    
    const tableNames = mockTables.filter(t => config.tableIds.includes(t.id)).map(t => t.name);

    // --- Gamification Update ---
    if (mockSettings.quitPenaltyEnabled) {
        mockGlobalStats.xp -= 30;
        mockRewardEvents.push({
            id: `evt-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'session_quit',
            description: `Quit session with ${tableNames.join(', ')}`,
            xpChange: -30,
        });
    }

    mockGlobalStats.quitQueueReal += 1;
    
    await this.saveStudySession({
        status: 'quit',
        tableIds: config.tableIds,
        tableNames,
        modes: config.modes,
        wordCount: config.words.length,
    });
    persistState();
  },

  createTable: async (name: string, columns: ColumnDef[]): Promise<VocabTable> => {
    await new Promise(res => setTimeout(res, 200));
    const newTable: VocabTable = {
        id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
        name,
        columns,
        rows: [],
    };
    mockTables.push(newTable);
    persistState();
    return newTable;
  },

  createRelation: async (tableId: string, name: string, questionCols: string[], answerCols: string[], modes: StudyMode[]): Promise<Relation> => {
    await new Promise(res => setTimeout(res, 200));
    const newRelation: Relation = {
        id: `rel-${Date.now()}-${Math.random()}`,
        tableId,
        name,
        questionCols,
        answerCols,
        modes,
    };
    mockRelations.push(newRelation);
    persistState();
    return newRelation;
  },

  addWord: async (tableId: string, keyword: string, data: Record<string, string>): Promise<VocabRow> => {
    await new Promise(res => setTimeout(res, 200));
    const table = mockTables.find(t => t.id === tableId);
    if (!table) {
        throw new Error(`Table with id ${tableId} not found.`);
    }

    const keywordExists = table.rows.some(row => row.keyword.toLowerCase() === keyword.toLowerCase());
    if (keywordExists) {
        throw new Error(`The keyword "${keyword}" already exists in this table.`);
    }
    
    const newRow = createNewRow(tableId, keyword, data);
    
    mockTables = mockTables.map(t => {
      if (t.id === tableId) {
        return { ...t, rows: [...t.rows, newRow] };
      }
      return t;
    });
    persistState();
    return newRow;
  },
  
  updateWord: async (tableId: string, wordId: string, newKeyword: string, newData: Record<string, string>): Promise<VocabRow> => {
    await new Promise(res => setTimeout(res, 200));
    const table = mockTables.find(t => t.id === tableId);
    if (!table) {
        throw new Error(`Table with id ${tableId} not found.`);
    }
    
    // Check for keyword conflict, excluding the current word being edited
    const keywordExists = table.rows.some(row => row.id !== wordId && row.keyword.toLowerCase() === newKeyword.toLowerCase());
    if (keywordExists) {
        throw new Error(`The keyword "${newKeyword}" already exists in this table.`);
    }

    let updatedRow: VocabRow | null = null;
    mockTables = mockTables.map(t => {
        if (t.id === tableId) {
            return {
                ...t,
                rows: t.rows.map(row => {
                    if (row.id === wordId) {
                        updatedRow = {
                            ...row,
                            keyword: newKeyword,
                            data: newData,
                        };
                        return updatedRow;
                    }
                    return row;
                })
            };
        }
        return t;
    });
    persistState();
    if (!updatedRow) {
      throw new Error(`Word with id ${wordId} not found.`);
    }

    return updatedRow;
  },

  deleteWord: async (tableId: string, wordId: string): Promise<void> => {
    await new Promise(res => setTimeout(res, 200));
    mockTables = mockTables.map(table => {
      if (table.id === tableId) {
        const initialLength = table.rows.length;
        const newRows = table.rows.filter(row => row.id !== wordId);
        if (newRows.length === initialLength) {
            console.warn(`Attempted to delete word with id ${wordId}, but it was not found.`);
        }
        return { ...table, rows: newRows };
      }
      return table;
    });
    persistState();
  },

  addColumn: async (tableId: string, newColumn: ColumnDef): Promise<void> => {
    await new Promise(res => setTimeout(res, 100));
    mockTables = mockTables.map(table => {
      if (table.id === tableId) {
        if (table.columns.some(c => c.name === newColumn.name) || newColumn.name.trim() === '' || newColumn.name.toLowerCase() === 'keyword') {
          console.error("Invalid table or column name exists.");
          return table;
        }
        return {
          ...table,
          columns: [...table.columns, newColumn],
          rows: table.rows.map(row => ({
            ...row,
            data: { ...row.data, [newColumn.name]: '' }
          }))
        };
      }
      return table;
    });
    persistState();
  },

  removeColumn: async (tableId: string, columnName: string): Promise<void> => {
     await new Promise(res => setTimeout(res, 100));
     mockTables = mockTables.map(table => {
       if (table.id === tableId) {
         if (columnName.toLowerCase() === 'keyword' || !table.columns.some(c => c.name === columnName)) {
           console.error("Cannot remove keyword or non-existent column.");
           return table;
         }
         
         const newRows = table.rows.map(row => {
           const newData = { ...row.data };
           delete newData[columnName];
           return { ...row, data: newData };
         });

         return {
           ...table,
           columns: table.columns.filter(c => c.name !== columnName),
           rows: newRows
         };
       }
       return table;
     });
     persistState();
  },

  renameColumn: async (tableId: string, oldName: string, newName: string): Promise<void> => {
    await new Promise(res => setTimeout(res, 100));
    mockTables = mockTables.map(table => {
      if (table.id === tableId) {
        if (newName.trim() === '' || oldName.toLowerCase() === 'keyword' || newName.toLowerCase() === 'keyword' || table.columns.some(c => c.name === newName)) {
          console.error("Invalid rename operation.");
          return table;
        }
        const colExists = table.columns.some(c => c.name === oldName);
        if (!colExists) return table;

        const newRows = table.rows.map(row => {
          const newData = { ...row.data };
          if (Object.prototype.hasOwnProperty.call(newData, oldName)) {
              newData[newName] = newData[oldName];
              delete newData[oldName];
          }
          return { ...row, data: newData };
        });

        return {
          ...table,
          columns: table.columns.map(c => c.name === oldName ? { ...c, name: newName } : c),
          rows: newRows
        };
      }
      return table;
    });
    persistState();
  },
  
  resetWordStats: async (tableId: string, wordId: string): Promise<void> => {
    await new Promise(res => setTimeout(res, 100));
    mockTables = mockTables.map(table => {
      if (table.id === tableId) {
        return {
          ...table,
          rows: table.rows.map(row => {
            if (row.id === wordId) {
              return {
                ...row,
                stats: recalculateStats({
                    Passed1: 0, Passed2: 0, Failed: 0,
                    InQueue: 0, QuitQueue: false,
                    LastPracticeDate: null, flashcardStatus: 'None'
                })
              };
            }
            return row;
          })
        };
      }
      return table;
    });
    persistState();
  },

  bulkTagWords: async (tableId: string, wordIds: string[], tagsToAdd: string[]): Promise<void> => {
    await new Promise(res => setTimeout(res, 200));
    mockTables = mockTables.map(table => {
      if (table.id === tableId) {
        const wordIdSet = new Set(wordIds);
        return {
          ...table,
          rows: table.rows.map(row => {
            if (wordIdSet.has(row.id)) {
              const newTags = new Set([...row.tags, ...tagsToAdd]);
              return { ...row, tags: Array.from(newTags).sort() };
            }
            return row;
          })
        };
      }
      return table;
    });
    persistState();
  },

  importData: async (tableId: string, rows: Array<Record<string, string>>, strategy: ConflictResolutionStrategy): Promise<void> => {
    await new Promise(res => setTimeout(res, 200));
    const table = mockTables.find(t => t.id === tableId);
    if (!table) return;

    const columnNames = table.columns.map(c => c.name);

    rows.forEach(row => {
        const { keyword, ...data } = row;
        if (!keyword) return;

        const existingRow = table.rows.find(r => r.keyword.toLowerCase() === keyword.toLowerCase());

        if (existingRow) { // Conflict
            if (strategy === 'addNewOnly') {
                return; // Skip
            }
            if (strategy === 'overwrite') {
                Object.keys(existingRow.data).forEach(key => {
                    existingRow.data[key] = data[key] || '';
                });
            } else if (strategy === 'merge') {
                Object.entries(data).forEach(([key, value]) => {
                    if (value) { // Merges non-empty values
                        existingRow.data[key] = value as string;
                    }
                });
            }
        } else { // No conflict, add new row
            const newRowData: Record<string, string> = {};
            columnNames.forEach(col => {
                newRowData[col] = data[col] || '';
            });
            table.rows.push(createNewRow(tableId, keyword, newRowData));
        }
    });
    persistState();
  },
  updateFlashcardStatus: async (tableId: string, wordId: string, status: 'Hard' | 'Good' | 'Easy'): Promise<void> => {
    await new Promise(res => setTimeout(res, 50));
    const table = mockTables.find(t => t.id === tableId);
    const row = table?.rows.find(r => r.id === wordId);
    if (row) {
        row.stats.flashcardStatus = status;
    } else {
        console.warn(`Could not find word ${wordId} in table ${tableId} to update flashcard status.`);
    }
    persistState();
  },
  calculatePriorityScore,
};