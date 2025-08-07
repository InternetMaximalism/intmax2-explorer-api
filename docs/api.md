# API

Here are example commands for accessing the INTMAX2 Explorer API using curl.
Use these endpoints to check node health, fetch blocks, deposits, withdrawals, and perform searches.

## API Usage

```sh
export ENDPOINT='http://localhost:3000'

# health
curl -i --location --request GET "$ENDPOINT/v1/health"
curl -i -H "X-API-KEY: dummy" --location --request GET "$ENDPOINT/v1/health/redis"

# stats
curl -i --location --request GET "$ENDPOINT/v1/stats"

# search(block number, block hash, deposit hash, withdrawal hash)
curl -i --location --request GET "$ENDPOINT/v1/search?query=0x"

# blocks(block hash)
curl -i --location --request GET "$ENDPOINT/v1/blocks"
curl -i --location --request GET "$ENDPOINT/v1/blocks?perPage=50&cursor=0x"

# block detail(block bash)
curl -i --location --request GET "$ENDPOINT/v1/blocks/0x"

# block validity proof
curl -i --location --request GET "$ENDPOINT/v1/blocks/100/validityProof"

# deposits(deposit hash)
curl -i --location --request GET "$ENDPOINT/v1/deposits"
curl -i --location --request GET "$ENDPOINT/v1/deposits?perPage=50&cursor=0x"
curl -i --location --request GET "$ENDPOINT/v1/deposits?tokenType=1&status=Completed"

# deposit detail(deposit hash)
curl -i --location --request GET "$ENDPOINT/v1/deposits/0x"

# withdrawals(withdrawal hash)
curl -i --location --request GET "$ENDPOINT/v1/withdrawals"
curl -i --location --request GET "$ENDPOINT/v1/withdrawals?perPage=50&cursor=0x"
curl -i --location --request GET "$ENDPOINT/v1/withdrawals?tokenType=1&status=Completed"

# withdrawal detail(withdrawal hash)
curl -i --location --request GET "$ENDPOINT/v1/withdrawals/0x"
```
