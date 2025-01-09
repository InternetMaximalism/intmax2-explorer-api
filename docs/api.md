# API

## API Usage

```sh
export ENDPOINT='http://localhost:3000'

# health
curl -i --location --request GET "$ENDPOINT/v1/health"

# stats
curl -i --location --request GET "$ENDPOINT/v1/stats"

# search
curl -i --location --request GET "$ENDPOINT/v1/search?query=0x"

# blocks
curl -i --location --request GET "$ENDPOINT/v1/blocks"
curl -i --location --request GET "$ENDPOINT/v1/blocks?perPage=50&cursor=0x"

# block detail
curl -i --location --request GET "$ENDPOINT/v1/blocks/0x"

# deposits
curl -i --location --request GET "$ENDPOINT/v1/deposits"
curl -i --location --request GET "$ENDPOINT/v1/deposits?perPage=50&cursor=0x"
curl -i --location --request GET "$ENDPOINT/v1/deposits?tokenType=1&status=Completed"

# deposit detail
curl -i --location --request GET "$ENDPOINT/v1/deposits/0x"

# withdrawals
curl -i --location --request GET "$ENDPOINT/v1/withdrawals"
curl -i --location --request GET "$ENDPOINT/v1/withdrawals?perPage=50&cursor=0x"
curl -i --location --request GET "$ENDPOINT/v1/withdrawals?tokenType=1&status=Completed"

# withdrawal detail
curl -i --location --request GET "$ENDPOINT/v1/withdrawals/0x"
```
