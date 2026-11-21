from pyteal import *

def approval_program():
    
    _ascii_zero = 48
    _ascii_nine = _ascii_zero + 9
    ascii_zero = Int(_ascii_zero)
    ascii_nine = Int(_ascii_nine)

    @Subroutine(TealType.uint64)
    def ascii_to_int(arg):
        """ascii_to_int converts the integer representing a character in ascii to the actual integer it represents
        Args:
            arg: uint64 in the range 48-57 that is to be converted to an integer
        Returns:
            uint64 that is the value the ascii character passed in represents
        """
        return Seq(Assert(arg >= ascii_zero), Assert(arg <= ascii_nine), arg - ascii_zero)

    @Subroutine(TealType.uint64)
    def pow10(x) -> Expr:
        """
        Returns 10^x, useful for things like total supply of an asset
        """
        return Exp(Int(10), x)

    @Subroutine(TealType.uint64)
    def atoi(a):
        """atoi converts a byte string representing a number to the integer value it represents"""
        return If(
            Len(a) > Int(0),
            (ascii_to_int(GetByte(a, Int(0))) * pow10(Len(a) - Int(1)))
            + atoi(Substring(a, Int(1), Len(a))),
            Int(0),
        )

    @Subroutine(TealType.bytes)
    def itoa(i):
        """itoa converts an integer to the ascii byte string it represents"""
        return If(
            i == Int(0),
            Bytes("0"),
            Concat(
                If(i / Int(10) > Int(0), itoa(i / Int(10)), Bytes("")),
                int_to_ascii(i % Int(10)),
            ),
        )

    @Subroutine(TealType.bytes)
    def int_to_ascii(arg):
        """int_to_ascii converts an integer to the ascii byte that represents it"""
        return Extract(Bytes("0123456789"), arg, Int(1))
    
    # don't need any real fancy initialization
    handle_creation = Return(
        Seq(
            Assert(Txn.sender() == Addr("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM")),
            App.globalPut(Bytes("amendNum"), Int(0)),
            App.globalPut(Bytes("round"), Txn.first_valid()),
            Int(1)
        )
    )

    i = ScratchVar(TealType.uint64)

    propose = Seq(
        Assert(Txn.sender() == Addr("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM")),
        Assert(Len(Txn.application_args[1]) >= Int(50)),
        Assert(Len(Txn.application_args[1]) <= Int(2000)),
        App.box_put(Bytes("Proposal"), Txn.application_args[1]),
        Assert(App.box_create(Bytes("Votes"), Int(2000))),
        Int(1)
    )

    #183000


    amend = Seq(
        Assert(Txn.first_valid() <= Add(App.globalGet(Bytes("round")), Int(183000))),
        Assert(Txn.sender() == Addr("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM")),
        Assert(Len(Txn.application_args[1]) >= Int(25)),
        Assert(Len(Txn.application_args[1]) <= Int(1000)),
        App.box_put(Concat(Bytes("Amend"), itoa(App.globalGet(Bytes("amendNum")))), Txn.application_args[1]),
        Assert(App.box_create(Concat(Bytes("Votes"), itoa(App.globalGet(Bytes("amendNum")))), Int(2000))),
        App.globalPut(Bytes("amendNum"), Add(App.globalGet(Bytes("amendNum")), Int(1))),
        Int(1)
    )

    #549000


    voteProp = Seq(
        box := App.box_get(Bytes("Amend0")),
        If(box.hasValue(),
        Seq(
            Assert(Txn.first_valid() >= Add(App.globalGet(Bytes("round")), Int(366000))),
        ),
        Seq(
            Assert(Txn.first_valid() >= Add(App.globalGet(Bytes("round")), Int(183000))),
        )
        ),
        For(i.store(Int(0)), i.load() < Txn.assets.length(), i.store(i.load() + Int(1))).Do(Seq(
        senderAssetBalance := AssetHolding.balance(Txn.sender(), Txn.assets[i.load()]),
        Assert(senderAssetBalance.value() == Int(1)),
        assetCreator := AssetParam.creator(Txn.assets[i.load()]),
        Assert(assetCreator.value() == Addr("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE")),
        unitName := AssetParam.unitName(Txn.assets[i.load()]),
        Assert(Substring(unitName.value(), Int(0), Int(4)) == Bytes("DCGV")),
        If(Btoi(App.box_extract(Bytes("Votes"), atoi(Substring(unitName.value(), Int(4), Len(unitName.value()))), Int(1))) == Int(0),
        Seq(
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: Txn.sender(),
            TxnField.amount: Div(Int(20000000), Int(2000)),
        }),
        InnerTxnBuilder.Submit()
        )
        ),
        App.box_replace(Bytes("Votes"), atoi(Substring(unitName.value(), Int(4), Len(unitName.value()))), Txn.application_args[1]),
        )),
        Int(1)

    )

    voteAmend = Seq(
        Assert(Txn.first_valid() <= Add(App.globalGet(Bytes("round")), Int(366000))),
        Assert(Txn.first_valid() >= Add(App.globalGet(Bytes("round")), Int(183000))),
        For(i.store(Int(0)), i.load() < Txn.assets.length(), i.store(i.load() + Int(1))).Do(Seq(
        senderAssetBalance := AssetHolding.balance(Txn.sender(), Txn.assets[i.load()]),
        Assert(senderAssetBalance.value() == Int(1)),
        assetCreator := AssetParam.creator(Txn.assets[i.load()]),
        Assert(assetCreator.value() == Addr("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE")),
        unitName := AssetParam.unitName(Txn.assets[i.load()]),
        Assert(Substring(unitName.value(), Int(0), Int(4)) == Bytes("DCGV")),
        If(Btoi(App.box_extract(Concat(Bytes("Votes"), Txn.application_args[1]), atoi(Substring(unitName.value(), Int(4), Len(unitName.value()))), Int(1))) == Int(0),
        Seq(
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: Txn.sender(),
            TxnField.amount: Div(Int(10000000), Int(2000)),
        }),
        InnerTxnBuilder.Submit()
        )
        ),
        App.box_replace(Concat(Bytes("Votes"), Txn.application_args[1]), atoi(Substring(unitName.value(), Int(4), Len(unitName.value()))), Txn.application_args[2]),
        )),
        Int(1)

    )

    draft = Seq(
        box := App.box_get(Bytes("Amend0")),
        If(box.hasValue(),
        Seq(
            Assert(Txn.first_valid() >= Add(App.globalGet(Bytes("round")), Int(549000))),
        ),
        Seq(
            Assert(Txn.first_valid() >= Add(App.globalGet(Bytes("round")), Int(366000))),
        )
        ),
        Assert(Txn.sender() == Addr("762FFO2SIDJG2H7SXU5BQLQJ4Q5BQPGKKJGS2LEDQSJ7N5EMB2VVZMSMXM")),
        If(Txn.application_args[1] == Bytes("accept"),
        App.box_put(Bytes("Draft"), Txn.application_args[2]),
        App.globalPut(Bytes("round"), Txn.first_valid()),
        ),
        Int(1)
    )

    rewardAsset = Seq(
        Assert(Txn.sender() == Addr("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE")),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.accounts[1],
            TxnField.asset_amount: Btoi(Txn.application_args[1]),
        }),
        InnerTxnBuilder.Submit(),
        Int(1)
    )

    rewardAlgo = Seq(
        Assert(Txn.sender() == Addr("AL6F3TFPSZPF3BSVUFDNOLMEKUCJJAA7GZ5GF3DN3Q4IVJVNUFK76PQFNE")),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: Txn.accounts[1],
            TxnField.amount: Btoi(Txn.application_args[1]),
        }),
        InnerTxnBuilder.Submit(),
        Int(1)
    )
    
    opt_in = Seq(
         For(i.store(Int(0)), i.load() < Txn.assets.length(), i.store(i.load() + Int(1))).Do(Seq(
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[i.load()],
                TxnField.asset_receiver: Global.current_application_address(),
                TxnField.asset_amount: Int(0),
            }),
            InnerTxnBuilder.Submit()
         )),
         Int(1)
    )

    # doesn't need anyone to opt in
    handle_optin = Return(Int(1))

    # only the creator can closeout the contract
    handle_closeout = Return(Int(1))

    # nobody can update the contract
    handle_updateapp =  Return(Txn.sender() == Global.creator_address())

    # only creator can delete the contract
    handle_deleteapp = Return(Txn.sender() == Global.creator_address())


    # handle the types of application calls
    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.application_args[0] == Bytes("optin"), Return(opt_in)],
        [Txn.application_args[0] == Bytes("amend"), Return(amend)],
        [Txn.application_args[0] == Bytes("propose"), Return(propose)],
        [Txn.application_args[0] == Bytes("voteProp"), Return(voteProp)],
        [Txn.application_args[0] == Bytes("voteAmend"), Return(voteAmend)],
        [Txn.application_args[0] == Bytes("draft"), Return(draft)],
        [Txn.application_args[0] == Bytes("rewardAlgo"), Return(rewardAlgo)],
        [Txn.application_args[0] == Bytes("rewardAsset"), Return(rewardAsset)],






    )
    
    return program

# let clear state happen
def clear_state_program():
    program = Return(Int(1))
    return program
    


if __name__ == "__main__":
    with open("vote_approval.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=8)
        f.write(compiled)

    with open("vote_clear_state.teal", "w") as f:
        compiled = compileTeal(clear_state_program(), mode=Mode.Application, version=8)
        f.write(compiled)