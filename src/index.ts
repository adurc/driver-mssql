import sql from 'mssql';
import { entityDirective, columnDirective, relationDirective } from './directives';
import { ISqlDriverOptions } from './interfaces';
import { SQLContext } from './context';
import { entityTranformFromModel } from './entity-transformer';
import { CriteriaBuilder } from './criteria-builder';
import { QueryContextPrinter } from './query-print';
import { ObjectExpander } from './object-expander';
import { AggregateBuilder } from './aggregate-builder';
import { CreateBuilder } from './create-builder';
import { UpdateBuilder } from './update-builder';
import { AdurcContext, AdurcDriver } from '@adurc/core';
import { ProjectionInfo, ProjectionInfoExpand } from '@adurc/core/dist/interfaces/projection';
import { IDriverAggregateRes, IDriverCreateUpdateRes, TDriverDeleteRes, TDriverReadRes } from '@adurc/core/dist/bedrock/driver';

export class SqlServerDriver extends AdurcDriver {
    name = 'mssql';
    directives = [
        entityDirective,
        columnDirective,
        relationDirective,
    ];

    private readonly pool: sql.ConnectionPool;
    private context: SQLContext | null = null;

    constructor(options: ISqlDriverOptions) {
        super();
        this.pool = new sql.ConnectionPool({
            ...options.config,
        });
    }

    public setContext(context: AdurcContext): void {
        this.context = {
            dataServerContext: context,
            entities: context.models.map(x => entityTranformFromModel(context, x)),
        };
    }

    public async init(): Promise<void> {
        await this.pool.connect();
    }

    public async create(projection: ProjectionInfo): Promise<IDriverCreateUpdateRes> {
        if (!projection.args || !projection.args.objects) {
            throw new Error('Required argument objects');
        }

        const returning = projection.fields.find(x => x.name === 'returning') as ProjectionInfoExpand;
        const returnAffectedrows = projection.fields.findIndex(x => x.name === 'affected_rows') >= 0;

        const model = this.context.entities.find(x => x.info.name === projection.name);

        if (!model) {
            throw new Error(`Model ${projection.name} not registered`);
        }

        const createQueryResult = CreateBuilder.build(
            this.context,
            model,
            projection.args.objects as Record<string, unknown>[],
        );

        const request = this.pool.request();

        let query = createQueryResult.chunks.join('\n');

        for (const param in createQueryResult.params) {
            request.input(param, createQueryResult.params[param]);
        }

        if (returning) {
            returning.name = model.info.name;

            const queryResults = CriteriaBuilder.build(
                this.context,
                returning,
                undefined,
                model.info.name,
            );

            for (const queryResult of queryResults) {

                for (const param in queryResult.params) {
                    request.input(param, queryResult.params[param]);
                }

                query += QueryContextPrinter.print(queryResult) + '\n';
            }
        }

        console.log(query);

        const result = await request.query(query);

        const output: IDriverCreateUpdateRes = {};
        if (returning) {
            output.returning = ObjectExpander.buildReadOutput(this.context, returning, result.recordsets).result;
        }
        if (returnAffectedrows) {
            output.affectedRows = result.rowsAffected.reduce((a, b) => a + b, 0);
        }
        return output;
    }

    public async update(projection: ProjectionInfo): Promise<IDriverCreateUpdateRes> {
        if (!projection.args || !projection.args._set) {
            throw new Error('Required argument _set');
        }

        const returning = projection.fields.find(x => x.name === 'returning') as ProjectionInfoExpand;
        const returnAffectedrows = projection.fields.findIndex(x => x.name === 'affected_rows') >= 0;

        const model = this.context.entities.find(x => x.info.name === projection.name);

        if (!model) {
            throw new Error(`Model ${projection.name} not registered`);
        }

        const updateQueryResult = UpdateBuilder.build(
            this.context,
            model,
            projection as ProjectionInfoExpand,
        );

        const request = this.pool.request();

        let query = updateQueryResult.chunks.join('\n');

        for (const param in updateQueryResult.params) {
            request.input(param, updateQueryResult.params[param]);
        }

        if (returning) {
            returning.name = model.info.name;

            const queryResults = CriteriaBuilder.build(
                this.context,
                returning,
                undefined,
                model.info.name,
            );

            for (const queryResult of queryResults) {

                for (const param in queryResult.params) {
                    request.input(param, queryResult.params[param]);
                }

                query += '\n' + QueryContextPrinter.print(queryResult);
            }
        }


        const result = await request.query(query);

        const output: IDriverCreateUpdateRes = {};
        if (returning) {
            output.returning = ObjectExpander.buildReadOutput(this.context, returning, result.recordsets).result;
        }
        if (returnAffectedrows) {
            output.affectedRows = result.rowsAffected.reduce((a, b) => a + b, 0);
        }
        return output;
    }

    public async read(projection: ProjectionInfo): Promise<TDriverReadRes> {
        const queryResults = CriteriaBuilder.build(this.context, projection);

        const request = this.pool.request();

        const queries: string[] = [];
        for (const queryResult of queryResults) {

            for (const param in queryResult.params) {
                request.input(param, queryResult.params[param]);
            }

            queries.push(QueryContextPrinter.print(queryResult));
        }

        const finallyQuery = queries.join('\n');

        console.log('super query', finallyQuery);

        const result = await request.query(finallyQuery);

        const output = ObjectExpander.buildReadOutput(this.context, projection, result.recordsets);

        return output.result;
    }

    public async delete(/* projection: ProjectionInfo */): Promise<TDriverDeleteRes> {
        throw new Error('not implemented');
    }

    public async aggregate(projection: ProjectionInfo): Promise<IDriverAggregateRes> {
        const queryResult = AggregateBuilder.build(this.context, projection);

        const request = this.pool.request();

        for (const param in queryResult.params) {
            request.input(param, queryResult.params[param]);
        }

        const query = QueryContextPrinter.print(queryResult);
        const result = await request.query(query);

        return {
            aggregate: ObjectExpander.simpleExpandObject(result.recordset[0]),
        };
    }
}