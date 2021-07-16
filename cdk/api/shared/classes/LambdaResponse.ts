import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export class LambdaResponse implements APIGatewayProxyStructuredResultV2 {
  statusCode: number;
  body: string;
  headers: {
    [header: string]: boolean | number | string;
  };

  constructor(
    statusCode: number,
    body: any,
    headers?: {
      [header: string]: boolean | number | string;
    }
  ) {
    this.statusCode = statusCode;
    this.body = JSON.stringify(body);
    this.headers = headers || {
      'Access-Control-Allow-Origin': '*',
    };
  }
}
