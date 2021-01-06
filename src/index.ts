import mssql from 'mssql';
import { AdurcDriver } from '@adurc/core/dist/interfaces/driver';
import { AdurcAggregateArgs } from '@adurc/core/dist/interfaces/client/aggregate.args';
import { BatchResult } from '@adurc/core/dist/interfaces/client/batch.result';
import { AdurcCreateArgs } from '@adurc/core/dist/interfaces/client/create.args';
import { AdurcDeleteArgs } from '@adurc/core/dist/interfaces/client/delete.args';
import { AdurcFindManyArgs } from '@adurc/core/dist/interfaces/client/find-many.args';
import { AdurcUpdateArgs } from '@adurc/core/dist/interfaces/client/update.args';
import { BuilderGeneratorFunction, BuilderStage } from '@adurc/core/dist/interfaces/builder.generator';
import { entityDirective } from './directives/entity.directive';
import { columnDirective } from './directives/column.directive';
import { fieldDirective } from './directives/field.directive';
import { oneToManyDirective } from './directives/one-to-many.directive';
import { manyToOneDirective } from './directives/many-to-one.directive';
import { EntityConverter } from './entity.converter';
import { MSSQLEntity } from './interfaces/mssql-entity';
import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { FindQueryBuilder } from './query-builders/find.builder';
import { RecordsetConverter } from './recordset.converter';
import { CreateQueryBuilder } from './query-builders/create.builder';
import { AdurcModelUntyped } from '@adurc/core/dist/interfaces/client/model';
import { UpdateQueryBuilder } from './query-builders/update.builder';
import { DeleteQueryBuilder } from './query-builders/delete.builder';
import { AggregateResult } from '@adurc/core/dist/interfaces/client/aggregate.result';
import { AggregateQueryBuilder } from './query-builders/aggregate.builder';
import { manyToManyDirective } from './directives/many-to-many.directive';
import { IAdurcLogger } from '@adurc/core/dist/interfaces/logger';

export class SqlServerDriver implements AdurcDriver {
    private readonly pool: mssql.ConnectionPool;
    private entities: MSSQLEntity[];
    private logger: IAdurcLogger;

    constructor(options: { pool: mssql.ConnectionPool }) {
        this.pool = options.pool;
    }

    async createMany(model: AdurcModel, args: AdurcCreateArgs): Promise<BatchResult> {
        this.logger?.debug('[driver-mssql] create many model: ' + model.name, { model: model.name, args });

        const entity = this.entities.find(x => x.info.name === model.name);
        if (!entity) {
            throw new Error(`[driver-mssq] Entity linked to model ${model.name} not found`);
        }

        const context = CreateQueryBuilder.build(this.entities, entity, args);

        const sql = context.toSql();

        const request = this.pool.request();

        if (context.returning) {
            for (const param in context.returning.params) {
                request.input(param, context.returning.params[param]);
            }
        }

        const result = await request.query(sql);

        return RecordsetConverter.convertMutationMany(entity, args, result);
    }

    async findMany(model: AdurcModel, args: AdurcFindManyArgs): Promise<AdurcModelUntyped[]> {
        this.logger?.debug('[driver-mssql] find many model: ' + model.name, { model: model.name, args });
        const entity = this.entities.find(x => x.info.name === model.name);
        if (!entity) {
            throw new Error(`[driver-mssq] Entity linked to model ${model.name} not found`);
        }
        const context = FindQueryBuilder.build(this.entities, entity, args);

        const sql = context.toSql();

        const request = this.pool.request();

        for (const param in context.params) {
            request.input(param, context.params[param]);
        }

        const result = await request.query(sql);

        return RecordsetConverter.convertFindMany(entity, args, result);
    }

    async updateMany(model: AdurcModel, args: AdurcUpdateArgs): Promise<BatchResult> {
        this.logger?.debug('[driver-mssql] update many model: ' + model.name, { model: model.name, args });

        const entity = this.entities.find(x => x.info.name === model.name);
        if (!entity) {
            throw new Error(`[driver-mssq] Entity linked to model ${model.name} not found`);
        }

        const context = UpdateQueryBuilder.build(this.entities, entity, args);

        const sql = context.toSql();

        const request = this.pool.request();

        for (const param in context.params) {
            request.input(param, context.params[param]);
        }

        if (context.returning) {
            for (const param in context.returning.params) {
                request.input(param, context.returning.params[param]);
            }
        }

        const result = await request.query(sql);

        return RecordsetConverter.convertMutationMany(entity, args, result);
    }

    async deleteMany(model: AdurcModel, args: AdurcDeleteArgs): Promise<BatchResult> {
        this.logger?.debug('[driver-mssql] delete many model: ' + model.name, { model: model.name, args });

        const entity = this.entities.find(x => x.info.name === model.name);
        if (!entity) {
            throw new Error(`[driver-mssql] Entity linked to model ${model.name} not found`);
        }

        const context = DeleteQueryBuilder.build(this.entities, entity, args);

        const sql = context.toSql();

        const request = this.pool.request();

        for (const param in context.params) {
            request.input(param, context.params[param]);
        }

        const result = await request.query(sql);

        return RecordsetConverter.convertMutationMany(entity, args, result);
    }

    async aggregate(model: AdurcModel, args: AdurcAggregateArgs): Promise<AggregateResult> {
        this.logger?.debug('[driver-mssql] aggregate model: ' + model.name, { model: model.name, args });

        const entity = this.entities.find(x => x.info.name === model.name);
        if (!entity) {
            throw new Error(`[driver-mssq] Entity linked to model ${model.name} not found`);
        }

        const context = AggregateQueryBuilder.build(this.entities, entity, args);

        const sql = context.toSql();

        const request = this.pool.request();

        for (const param in context.params) {
            request.input(param, context.params[param]);
        }

        const result = await request.query(sql);

        return RecordsetConverter.convertAggregate(entity, args, result);
    }

    private setLogger(logger: IAdurcLogger): void {
        this.logger = logger;
    }

    private setEntities(entities: MSSQLEntity[]) {
        this.entities = entities;
    }

    static use(name: string, config: mssql.config): BuilderGeneratorFunction {

        const pool = new mssql.ConnectionPool(config);
        const driver = new SqlServerDriver({ pool });

        return async function* SourceGenerator(context) {
            driver.setLogger(context.logger);

            context.addSource({ name, driver });

            context.addDirective(entityDirective);
            context.addDirective(columnDirective);
            context.addDirective(fieldDirective);
            context.addDirective(oneToManyDirective);
            context.addDirective(manyToOneDirective);
            context.addDirective(manyToManyDirective);

            yield BuilderStage.OnInit;

            context.logger.debug(`[driver-mssql] models found: ${context.models.length}`);

            const entities = EntityConverter.fromModels(name, context.models);

            context.logger.debug(`[driver-mssql] entities registered: ${entities.length}`);

            driver.setEntities(entities);

            await pool.connect();
        };
    }
}