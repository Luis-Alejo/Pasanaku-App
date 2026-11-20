import type { CodegenConfig } from '@graphql-codegen/cli';

/** Genera tipos y servicios Angular a partir del esquema que publica el backend. */
const config: CodegenConfig = {
  schema: '../backend-pasanaku-app/src/schema.gql',
  documents: 'src/app/**/*.graphql',
  generates: {
    'src/app/graphql/generated.ts': {
      plugins: ['typescript-operations', 'typescript-apollo-angular'],
      config: {
        addExplicitOverride: true,
        useTypeImports: true,
        scalars: { DateTime: 'string' },
      },
    },
  },
};

export default config;
