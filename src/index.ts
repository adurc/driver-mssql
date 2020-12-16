import mssql from 'mssql';
import { AdurcDriver } from '@adurc/core/dist/interfaces/driver';
import { AdurcAggregateArgs } from '@adurc/core/dist/interfaces/client/aggregate.args';
import { BatchResult } from '@adurc/core/dist/interfaces/client/batch.result';
import { AdurcCreateArgs } from '@adurc/core/dist/interfaces/client/create.args';
import { AdurcDeleteArgs } from '@adurc/core/dist/interfaces/client/delete.args';
import { AdurcFindManyArgs } from '@adurc/core/dist/interfaces/client/find-many.args';
import { AdurcUpdateArgs } from '@adurc/core/dist/interfaces/client/update';
import { BuilderGeneratorFunction, BuilderStage } from '@adurc/core/dist/interfaces/builder.generator';
import { entityDirective } from './directives/entity.directive';
import { columnDirective } from './directives/column.directive';
import { fieldDirective } from './directives/field.directive';
import { oneToManyDirective } from './directives/one-to-many.directive';
import { manyToOneDirective } from './directives/many-to-one.directive';
import { EntityConverter } from './entity.converter';
import { MSSQLEntity } from './interfaces/mssql-entity';
import { AdurcModel } from '@adurc/core/dist/interfaces/model';
import { FindQueryBuilder } from './query-builders/find.query-builder';
import { RecordsetConverter } from './recordset.converter';

export class SqlServerDriver implements AdurcDriver {
    private readonly pool: mssql.ConnectionPool;
    private entities: MSSQLEntity[];

    constructor(options: { pool: mssql.ConnectionPool }) {
        this.pool = options.pool;
    }

    createMany(_model: AdurcModel, _args: AdurcCreateArgs): Promise<BatchResult<unknown>> {
        throw new Error('Method not implemented.');
    }

    async findMany(model: AdurcModel, args: AdurcFindManyArgs): Promise<unknown[]> {
        const entity = this.entities.find(x => x.info.name === model.name);
        const context = FindQueryBuilder.build(this.entities, entity, args);
        const sql = context.toSql();

        const request = this.pool.request();

        for (const param in context.params) {
            request.input(param, context.params[param]);
        }

        const result = await request.query(sql);

        return RecordsetConverter.convertResult(entity, args, result);
    }

    updateMany(_model: AdurcModel, _args: AdurcUpdateArgs): Promise<BatchResult<unknown>> {
        throw new Error('Method not implemented.');
    }

    deleteMany(_model: AdurcModel, _args: AdurcDeleteArgs): Promise<BatchResult<unknown>> {
        throw new Error('Method not implemented.');
    }

    aggregate(_model: AdurcModel, _args: AdurcAggregateArgs): unknown {
        throw new Error('Method not implemented.');
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
            context.directives.push(oneToManyDirective);

            yield BuilderStage.OnInit;

            const entities = EntityConverter.fromModels(context.models);
            driver.setEntities(entities);

            await pool.connect();
        };
    }
}