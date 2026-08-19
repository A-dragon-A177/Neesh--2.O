import { CacheService } from './CacheService';
import { EmbeddingService } from './EmbeddingService';
import { VectorStoreService } from './VectorStoreService';
import { LlmService } from './LlmService';
import { QueryExpansionService } from './QueryExpansionService';
import { RerankerService } from './RerankerService';
import { EvaluationService } from './EvaluationService';
import { IngestionService } from './IngestionService';
import { LearningService } from './LearningService';
import { ChatService } from './ChatService';

class ServiceContainer {
    public readonly cacheService: CacheService;
    public readonly embeddingService: EmbeddingService;
    public readonly vectorStore: VectorStoreService;
    public readonly llmService: LlmService;
    public readonly queryExpansionService: QueryExpansionService;
    public readonly rerankerService: RerankerService;
    public readonly evaluationService: EvaluationService;
    public readonly learningService: LearningService;
    public readonly ingestionService: IngestionService;
    public readonly chatService: ChatService;

    constructor() {
        this.cacheService = new CacheService();
        this.embeddingService = new EmbeddingService(this.cacheService);
        this.vectorStore = new VectorStoreService();
        this.llmService = new LlmService();
        this.queryExpansionService = new QueryExpansionService();
        this.rerankerService = new RerankerService(this.embeddingService);
        this.evaluationService = new EvaluationService(this.cacheService);
        this.learningService = new LearningService(this.embeddingService, this.vectorStore);
        this.ingestionService = new IngestionService(this.cacheService);
        this.chatService = new ChatService({
            cacheService: this.cacheService,
            embeddingService: this.embeddingService,
            vectorStore: this.vectorStore,
            llmService: this.llmService,
            queryExpansionService: this.queryExpansionService,
            rerankerService: this.rerankerService,
            evaluationService: this.evaluationService,
            learningService: this.learningService,
        });
        console.log('[ServiceContainer] Singleton services initialized successfully');
    }
}

export const services = new ServiceContainer();
