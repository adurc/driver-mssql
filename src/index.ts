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

export class SqlServerDriver implements AdurcDriver {
    private readonly pool: mssql.ConnectionPool;
    private entities: MSSQLEntity[];

    constructor(options: { pool: mssql.ConnectionPool }) {
        this.pool = options.pool;
    }

    async createMany(model: AdurcModel, args: AdurcCreateArgs): Promise<BatchResult> {
        console.log('[driver-mssql] createMany model: ' + model.name + ', args: ' + JSON.stringify(args));

        const entity = this.entities.find(x => x.info.name === model.name);
        if (!entity) {
            throw new Error(`[driver-mssq] Entity linked to model ${model.name} not found`);
        }

        const context = CreateQueryBuilder.build(this.entities, entity, args);

        console.log('[driver-mssql] context: ' + JSON.stringify(context));

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
        console.log('[driver-mssql] findMany model: ' + model.name + ', args: ' + JSON.stringify(args));
        const entity = this.entities.find(x => x.info.name === model.name);
        if (!entity) {
            throw new Error(`[driver-mssq] Entity linked to model ${model.name} not found`);
        }
        const context = FindQueryBuilder.build(this.entities, entity, args);

        console.log('[driver-mssql] context: ' + JSON.stringify(context));

        const sql = context.toSql();

        console.log('[driver-mssql] sql: ' + JSON.stringify(sql));

        const request = this.pool.request();

        for (const param in context.params) {
            request.input(param, context.params[param]);
        }

        const result = await request.query(sql);

        return RecordsetConverter.convertFindMany(entity, args, result);
    }

    async updateMany(model: AdurcModel, args: AdurcUpdateArgs): Promise<BatchResult> {
        console.log('[driver-mssql] updateMany model: ' + model.name + ', args: ' + JSON.stringify(args));

        const entity = this.entities.find(x => x.info.name === model.name);
        if (!entity) {
            throw new Error(`[driver-mssq] Entity linked to model ${model.name} not found`);
        }

        const context = UpdateQueryBuilder.build(this.entities, entity, args);

        console.log('[driver-mssql] context: ' + JSON.stringify(context));

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
        console.log('[driver-mssql] deleteMany model: ' + model.name + ', args: ' + JSON.stringify(args));

        const entity = this.entities.find(x => x.info.name === model.name);
        if (!entity) {
            throw new Error(`[driver-mssql] Entity linked to model ${model.name} not found`);
        }

        const context = DeleteQueryBuilder.build(this.entities, entity, args);

        console.log('[driver-mssql] context: ' + JSON.stringify(context));

        const sql = context.toSql();

        console.log('[driver-mssql] sql: ' + JSON.stringify(sql));

        const request = this.pool.request();

        for (const param in context.params) {
            request.input(param, context.params[param]);
        }

        const result = await request.query(sql);

        return RecordsetConverter.convertMutationMany(entity, args, result);
    }

    async aggregate(model: AdurcModel, args: AdurcAggregateArgs): Promise<AggregateResult> {
        console.log('[driver-mssql] aggregate model: ' + model.name + ', args: ' + JSON.stringify(args));

        const entity = this.entities.find(x => x.info.name === model.name);
        if (!entity) {
            throw new Error(`[driver-mssq] Entity linked to model ${model.name} not found`);
        }

        const context = AggregateQueryBuilder.build(this.entities, entity, args);

        console.log('[driver-mssql] context: ' + JSON.stringify(context));

        const sql = context.toSql();

        const request = this.pool.request();

        for (const param in context.params) {
            request.input(param, context.params[param]);
        }

        const result = await request.query(sql);

        return RecordsetConverter.convertAggregate(entity, args, result);
    }

    private setEntities(entities: MSSQLEntity[]) {
        this.entities = entities;
    }

    static use(name: string, config: mssql.config): BuilderGeneratorFunction {

        const pool = new mssql.ConnectionPool(config);
        const driver = new SqlServerDriver({ pool });

        return async function* SourceGenerator(context) {
            context.sources.push({ name, driver });

            context.directives.push(entityDirective);
            context.directives.push(columnDirective);
            context.directives.push(fieldDirective);
            context.directives.push(oneToManyDirective);
            context.directives.push(manyToOneDirective);
            context.directives.push(manyToManyDirective);

            yield BuilderStage.OnInit;

            console.log(`[driver-mssql] models found: ${context.models.length}`);

            const entities = EntityConverter.fromModels(name, context.models);

            console.log(`[driver-mssql] entities registered: ${entities.length}`);

            driver.setEntities(entities);

            await pool.connect();
        };
    }
}