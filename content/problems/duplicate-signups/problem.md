Email addresses are case-insensitive, but the sign-up form didn't know that: some people created
several accounts by typing their address with different capitalization (`Sam@Example.com` and
`sam@example.com`).

Find every email address that is used by **more than one account**, ignoring case.

### Output

| column          | description                        |
| --------------- | ---------------------------------- |
| `email`         | the address, in lowercase          |
| `account_count` | how many accounts use that address |

Rows can be in any order.
