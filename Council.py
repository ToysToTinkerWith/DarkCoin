from pyteal import *


def approval_program():

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
            App.globalPut(Bytes("Address"), Global.current_application_address()),
            Int(1)
        )
    )

    i = ScratchVar(TealType.uint64)


    propose = Seq(
        Assert(Len(Txn.application_args[1]) >= Int(50)),
        Assert(Len(Txn.application_args[1]) <= Int(2000)),
        Assert(Gtxn[0].amount() == Int(1000000)),
        Assert(Gtxn[0].receiver() == Global.current_application_address()),
        Assert(Gtxn[1].xfer_asset() == Int(601894079)),
        Assert(Gtxn[1].asset_amount() == Mul(Len(Txn.application_args[1]), Int(50))),
        Assert(Gtxn[1].asset_receiver() == Global.current_application_address()),
        App.box_put(Concat(Bytes("Proposal"), itoa(App.globalGet(Bytes("proposalNum")))), Txn.application_args[1]),
        Assert(App.box_create(Concat(Bytes("Votes"), itoa(App.globalGet(Bytes("proposalNum")))), Int(2000))),
        App.globalPut(Bytes("proposalNum"), Add(App.globalGet(Bytes("proposalNum")), Int(1))),
        Int(1)
        )
    
    
    opt_in = Seq(
        Assert(Txn.sender() == Addr("Z3W4BTN5JQQ76AFQX2B2TGU3NPKGXF7TA7OJ4BYS4BK5FAITCED7AFRZXI")),
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

    assetBalance = AssetHolding.balance(Global.current_application_address(), Txn.assets[0])

    change_state = Seq(
        App.globalPut(Bytes("proposalNum"), Int(1)),
        Int(1)
        )

    clear_assets = Seq(
        assetBalance,
        Assert(Txn.sender() == Addr("Z3W4BTN5JQQ76AFQX2B2TGU3NPKGXF7TA7OJ4BYS4BK5FAITCED7AFRZXI")),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.Payment,
            TxnField.receiver: Txn.sender(),
            TxnField.amount: Balance(Global.current_application_address()),
        }),
        InnerTxnBuilder.Submit(),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: assetBalance.value(),
        }),
        InnerTxnBuilder.Submit(),
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
        [Txn.application_args[0] == Bytes("changestate"), Return(change_state)],
        [Txn.application_args[0] == Bytes("clearassets"), Return(clear_assets)],
        [Txn.application_args[0] == Bytes("propose"), Return(propose)],



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