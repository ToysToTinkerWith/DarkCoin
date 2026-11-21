from pyteal import *


def approval_program():

    
    # don't need any real fancy initialization
    handle_creation = Return(Int(1))

    i = ScratchVar(TealType.uint64)


    createRaffle = Seq(
        Assert(Not(App.globalGet(Txn.sender()))),
        Assert(Txn.assets.length() > Int(0)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_amount: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        For(i.store(Int(1)), i.load() < Txn.assets.length(), i.store(i.load() + Int(1))).Do(Seq(
            Assert(Gtxn[Add(Txn.group_index(), i.load())].xfer_asset() == Txn.assets[i.load()]),
            Assert(Gtxn[Add(Txn.group_index(), i.load())].asset_receiver() == Global.current_application_address()),
            App.localPut(Txn.sender(), Itob(Txn.assets[i.load()]), Gtxn[Add(Txn.group_index(), i.load())].asset_amount()),
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[i.load()],
                TxnField.asset_receiver: Global.current_application_address(),
                TxnField.asset_amount: Int(0),
            }),
            InnerTxnBuilder.Submit(),
        )),
        App.localPut(Txn.sender(), Bytes("ticket_id"), Btoi(Txn.application_args[1])),
        App.localPut(Txn.sender(), Bytes("ticket_price"), Btoi(Txn.application_args[2])),
        Assert(Btoi(Txn.application_args[3]) <= Int(1000000)),
        App.globalPut(Txn.sender(), Add(Txn.first_valid(), Btoi(Txn.application_args[3]))),
        Int(1)
    )

    joinRaffle = Seq(
        Assert(Txn.first_valid() <= App.globalGet(Txn.accounts[1])),
        Assert(App.localGet(Txn.accounts[1], Bytes("ticket_id")) == Txn.assets[0]),
        Assert(Txn.sender() != Txn.accounts[1]),
        assetDec := AssetParam.decimals(Txn.assets[0]),
        Assert(Gtxn[Int(0)].xfer_asset() == App.localGet(Txn.accounts[1], Bytes("ticket_id"))),
        Assert(Gtxn[Int(0)].asset_amount() == Mul(Mul(App.localGet(Txn.accounts[1], Bytes("ticket_price")), Exp(Int(10), assetDec.value())), Btoi(Txn.application_args[1]))),
        Assert(Gtxn[Int(0)].asset_receiver() == Global.current_application_address()),
        Int(1)
    )

    rewardRaffle = Seq(
        Assert(Txn.sender() == Addr("VWYCYQ3H3PPNIGON4H363DIH7BP33TTZWUUUNMTDXCIHRCDPFOMU7VJ5HM")),
        decimals := AssetParam.decimals(Txn.assets[0]),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.accounts[2],
            TxnField.asset_amount: Mul(Mul(Btoi(Txn.application_args[Int(1)]), Exp(Int(10), decimals.value())), App.localGet(Txn.accounts[2], Bytes("ticket_price"))),
        }),
        InnerTxnBuilder.Submit(),
        For(i.store(Int(1)), i.load() < Txn.assets.length(), i.store(i.load() + Int(1))).Do(Seq(
            decimals := AssetParam.decimals(Txn.assets[i.load()]),
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: Txn.assets[i.load()],
                TxnField.asset_receiver: Txn.accounts[1],
                TxnField.asset_amount: Mul(Btoi(Txn.application_args[Add(i.load(), Int(1))]), Exp(Int(10), decimals.value())),
            }),
            InnerTxnBuilder.Submit(),
            App.localDel(Txn.accounts[2], Itob(Txn.assets[i.load()]))
         )),
        App.localDel(Txn.accounts[2], Bytes("ticket_id")),
        App.localDel(Txn.accounts[2], Bytes("ticket_price")),
        App.globalDel(Txn.accounts[2]),
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
        [Txn.application_args[0] == Bytes("createRaffle"), Return(createRaffle)],
        [Txn.application_args[0] == Bytes("joinRaffle"), Return(joinRaffle)],
        [Txn.application_args[0] == Bytes("rewardRaffle"), Return(rewardRaffle)],



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