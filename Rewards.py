from pyteal import *


def approval_program():
    
    # don't need any real fancy initialization
    handle_creation = Return(Int(1))
    
    addboxDC = Seq(
        Assert(Txn.sender() == Addr("YRVK422KP65SU4TBAHY34R7YT3OYFOL4DUSFR4UADQEQHS2HMXKORIC6TE")),
        contents := App.box_get(Concat(Txn.accounts[1], Bytes("DC"))),
        If(contents.hasValue(),
            Seq(
                Assert(App.box_delete(Concat(Txn.accounts[1], Bytes("DC")))),
                App.box_put(Concat(Txn.accounts[1], Bytes("DC")), Itob(Add(Btoi(contents.value()), Btoi(Txn.application_args[1]))))
            ),
            App.box_put(Concat(Txn.accounts[1], Bytes("DC")), Txn.application_args[1])
           ),
        Int(1)
    )

    acceptDC = Seq(
        contents := App.box_get(Concat(Txn.sender(), Bytes("DC"))),
        Assert(contents.hasValue()),
        App.localPut(Txn.sender(), Bytes("DC"), Btoi(contents.value())),
        Assert(App.box_delete(Concat(Txn.sender(), Bytes("DC")))),
        Int(1)
    )

    awardDC = Seq(
        Assert(dc := App.localGet(Txn.sender(), Bytes("DC"))),
        Assert(dc >= Int(0)),
        assetUnit := AssetParam.unitName(Txn.assets[0]),
        Assert(assetUnit.value() == Bytes("DARKCOIN")),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: Mul(dc, Int(1000000))
        }),
        InnerTxnBuilder.Submit(),
        App.localDel(Txn.sender(), Bytes("DC")), 
        Int(1)
    )

    addboxLP = Seq(
        Assert(Txn.sender() == Addr("NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ")),
        App.box_put(Concat(Txn.accounts[1], Bytes("LP")), Txn.application_args[1]),
        Int(1)
    )

    acceptLP = Seq(
        contents := App.box_get(Concat(Txn.sender(), Bytes("LP"))),
        Assert(contents.hasValue()),
        App.localPut(Txn.sender(), Bytes("LP"), Btoi(contents.value())),
        Assert(App.box_delete(Concat(Txn.sender(), Bytes("LP")))),
        Int(1)
    )

    awardLP = Seq(
        Assert(lp := App.localGet(Txn.sender(), Bytes("LP"))),
        Assert(lp >= Int(0)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: Mul(lp, Int(1000000))
        }),
        InnerTxnBuilder.Submit(),
        App.localDel(Txn.sender(), Bytes("LP")), 
        Int(1)
    )

    addboxNFT = Seq(
        Assert(Gtxn[1].asset_receiver() == Global.current_application_address()),
        Assert(Gtxn[1].xfer_asset() == Txn.assets[0]),
        Assert(Gtxn[1].asset_amount() == Btoi(Txn.application_args[1])),
        contents := App.box_get(Concat(Txn.accounts[1], Itob(Txn.assets[0]))),
        If(contents.hasValue(),
            Seq(
                Assert(App.box_delete(Concat(Txn.accounts[1], Itob(Txn.assets[0])))),
                App.box_put(Concat(Txn.accounts[1], Itob(Txn.assets[0])), Itob(Add(Btoi(contents.value()), Btoi(Txn.application_args[1]))))
            ),
            App.box_put(Concat(Txn.accounts[1], Itob(Txn.assets[0])), Txn.application_args[1])
           ),
        Int(1)
    )

    acceptNFT = Seq(
        contents := App.box_get(Concat(Txn.sender(), Itob(Txn.assets[0]))),
        Assert(contents.hasValue()),
        App.localPut(Txn.sender(), Itob(Txn.assets[0]), Btoi(contents.value())),
        Assert(App.box_delete(Concat(Txn.sender(), Itob(Txn.assets[0])))),
        Int(1)
    )

    awardNFT = Seq(
        Assert(nft := App.localGet(Txn.sender(), Itob(Txn.assets[0]))),
        Assert(nft >= Int(0)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: nft
        }),
        InnerTxnBuilder.Submit(),
        App.localDel(Txn.sender(), Itob(Txn.assets[0])), 
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

    opt_in = Seq(
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.xfer_asset: Txn.assets[0],
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_amount: Int(0),
        }),
        InnerTxnBuilder.Submit(),
        Int(1)
    )

    delbox = Seq(
        Assert(Txn.sender() == Addr("NSPLIQLVYV7US34UDYGYPZD7QGSHWND7AWSWPD4FTLRGW5IF2P2R3IF3EQ")),
        Assert(App.box_delete(Concat(Txn.accounts[1], Txn.application_args[1]))),
        Int(1)
    )


    # handle the types of application calls
    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.application_args[0] == Bytes("optin"), Return(opt_in)],
        [Txn.application_args[0] == Bytes("addboxDC"), Return(addboxDC)],
        [Txn.application_args[0] == Bytes("acceptDC"), Return(acceptDC)],
        [Txn.application_args[0] == Bytes("awardDC"), Return(awardDC)],
        [Txn.application_args[0] == Bytes("addboxLP"), Return(addboxLP)],
        [Txn.application_args[0] == Bytes("acceptLP"), Return(acceptLP)],
        [Txn.application_args[0] == Bytes("awardLP"), Return(awardLP)],
        [Txn.application_args[0] == Bytes("addboxNFT"), Return(addboxNFT)],
        [Txn.application_args[0] == Bytes("acceptNFT"), Return(acceptNFT)],
        [Txn.application_args[0] == Bytes("awardNFT"), Return(awardNFT)],
        [Txn.application_args[0] == Bytes("delbox"), Return(delbox)]




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